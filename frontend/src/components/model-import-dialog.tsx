import { Check, CircleAlert, X } from 'lucide-react'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { type ModelImportFormatId, type ModelImportRequirement } from '@/lib/model-import/model-import-types'
import {
  MODEL_IMPORT_FORMATS,
  MODEL_IMPORT_FORMATS_BY_ID
} from '@/lib/model-import/model-import-formats'
import { type ProjectionModelFileBundle } from '@/lib/model-pipelines/projection-model-file-bundle'
import { cn } from '@/lib/utils'

type ModelImportRequirementSelection = ModelImportRequirement & {
  file: File | null
}

type ModelImportDialogProps = {
  disabled?: boolean
  open: boolean
  onError: (message: string) => void
  onImport: (fileBundle: ProjectionModelFileBundle) => Promise<void> | void
  onOpenChange: (open: boolean) => void
}

const createRequirementSelections = (
  requirements: ModelImportRequirement[],
  prefilledRelatedFiles: ProjectionModelFileBundle['relatedFiles']
) => {
  const prefilledFileByUri = new Map(
    prefilledRelatedFiles.map((relatedFile) => [relatedFile.uri, relatedFile.file])
  )

  return requirements.map((requirement) => ({
    ...requirement,
    file: prefilledFileByUri.get(requirement.uri) ?? null
  }))
}

function ModelImportDialog({
  disabled = false,
  open,
  onError,
  onImport,
  onOpenChange
}: ModelImportDialogProps) {
  const entryInputRef = useRef<HTMLInputElement | null>(null)
  const additionalInputRef = useRef<HTMLInputElement | null>(null)
  const relatedInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const entryPreparationIdRef = useRef(0)
  const [selectedFormatId, setSelectedFormatId] = useState<ModelImportFormatId | null>(null)
  const [entryFile, setEntryFile] = useState<File | null>(null)
  const [entrySelectionSummary, setEntrySelectionSummary] = useState<string | null>(null)
  const [requirementSelections, setRequirementSelections] = useState<ModelImportRequirementSelection[]>([])
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])
  const [allowAdditionalFiles, setAllowAdditionalFiles] = useState(false)
  const [isPreparingEntry, setIsPreparingEntry] = useState(false)

  const selectedFormat = selectedFormatId ? MODEL_IMPORT_FORMATS_BY_ID[selectedFormatId] : null
  const isImportReady =
    entryFile !== null &&
    requirementSelections.every((requirementSelection) =>
      !requirementSelection.required || requirementSelection.file !== null
    ) &&
    !isPreparingEntry

  const resetDialog = () => {
    entryPreparationIdRef.current += 1
    setSelectedFormatId(null)
    setEntryFile(null)
    setEntrySelectionSummary(null)
    setRequirementSelections([])
    setAdditionalFiles([])
    setAllowAdditionalFiles(false)
    setIsPreparingEntry(false)
  }

  const handleFormatSelect = (formatId: ModelImportFormatId) => {
    entryPreparationIdRef.current += 1
    setSelectedFormatId(formatId)
    setEntryFile(null)
    setEntrySelectionSummary(null)
    setRequirementSelections([])
    setAdditionalFiles([])
    setAllowAdditionalFiles(false)
    setIsPreparingEntry(false)
  }

  const handleEntryFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !selectedFormat) {
      return
    }

    const preparationId = entryPreparationIdRef.current + 1
    entryPreparationIdRef.current = preparationId
    setIsPreparingEntry(true)
    setEntryFile(null)
    setEntrySelectionSummary(null)
    setRequirementSelections([])
    setAdditionalFiles([])
    setAllowAdditionalFiles(false)

    try {
      const preparation = await selectedFormat.prepareSelection(file)

      if (entryPreparationIdRef.current !== preparationId) {
        return
      }

      setEntryFile(preparation.entryFile)
      setEntrySelectionSummary(preparation.selectionSummary)
      setRequirementSelections(
        createRequirementSelections(
          preparation.requirements,
          preparation.prefilledRelatedFiles
        )
      )
      setAllowAdditionalFiles(preparation.allowAdditionalFiles ?? false)
    } catch (error) {
      if (entryPreparationIdRef.current !== preparationId) {
        return
      }

      onError(error instanceof Error ? error.message : 'Unable to prepare this 3D file import')
    } finally {
      if (entryPreparationIdRef.current === preparationId) {
        setIsPreparingEntry(false)
      }
    }
  }

  const handleRequirementFileChange = (
    requirementId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''

    if (!file) {
      return
    }

    setRequirementSelections((currentSelections) =>
      currentSelections.map((requirementSelection) =>
        requirementSelection.id === requirementId
          ? {
              ...requirementSelection,
              file
            }
          : requirementSelection
      )
    )
  }

  const clearRequirementFile = (requirementId: string) => {
    setRequirementSelections((currentSelections) =>
      currentSelections.map((requirementSelection) =>
        requirementSelection.id === requirementId
          ? {
              ...requirementSelection,
              file: null
            }
          : requirementSelection
      )
    )
  }

  const handleAdditionalFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setAdditionalFiles(files)
  }

  const handleImport = async () => {
    if (!entryFile) {
      onError('Choose the main 3D file before importing')
      return
    }

    const missingRequirement = requirementSelections.find(
      (requirementSelection) => requirementSelection.required && requirementSelection.file === null
    )
    if (missingRequirement) {
      onError(`Choose the required file for ${missingRequirement.uri}`)
      return
    }

    const fileBundle: ProjectionModelFileBundle = {
      entryFile,
      relatedFiles: [
        ...requirementSelections.flatMap((requirementSelection) =>
          requirementSelection.file
            ? [
                {
                  uri: requirementSelection.uri,
                  file: requirementSelection.file
                }
              ]
            : []
        ),
        ...additionalFiles
          .filter((file) => !requirementSelections.some((selection) => selection.file === file))
          .map((file) => ({ uri: file.name, file }))
      ]
    }

    resetDialog()
    onOpenChange(false)
    await onImport(fileBundle)
  }

  useEffect(() => {
    if (!open) {
      resetDialog()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-h-[calc(100vh-4rem)]">
        <DialogHeader>
          <DialogTitle>Import 3D model</DialogTitle>
          <DialogDescription>
            Pick a format first, then select the files for that pipeline.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 pr-3">
          <div className="grid gap-4 pr-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {MODEL_IMPORT_FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => handleFormatSelect(format.id)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card
                    className={cn(
                      'rounded-xl p-4 transition-colors',
                      selectedFormatId === format.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/40 hover:bg-accent/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{format.title}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{format.description}</p>
                      </div>
                      {selectedFormatId === format.id ? <Check className="mt-0.5 size-4 text-primary" /> : null}
                    </div>
                  </Card>
                </button>
              ))}
            </div>

            {selectedFormat ? (
              <Card className="grid gap-4 rounded-xl bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{selectedFormat.entryLabel}</div>
                    <p className="text-xs text-muted-foreground">{selectedFormat.entryHint}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => entryInputRef.current?.click()}
                    disabled={disabled || isPreparingEntry}
                  >
                    {entryFile ? 'Replace file' : 'Choose file'}
                  </Button>
                </div>

                <Card className="rounded-lg bg-background px-3 py-2 text-sm">
                  {isPreparingEntry ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Spinner className="size-4" />
                      Inspecting import files...
                    </span>
                  ) : entrySelectionSummary ? (
                    <span className="text-foreground">{entrySelectionSummary}</span>
                  ) : (
                    <span className="text-muted-foreground">No file selected yet</span>
                  )}
                </Card>

                {selectedFormatId === 'gltf' ? (
                  <Card className="rounded-lg border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-start gap-2">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      <span>
                        GLTF imports can use a `.zip` archive for auto-fill, or a `.gltf` / `.glb`
                        file plus any required `.bin` and image sidecars.
                      </span>
                    </span>
                  </Card>
                ) : null}

                {requirementSelections.length > 0 ? (
                  <div className="grid gap-3">
                    {requirementSelections.map((requirementSelection) => (
                      <Card key={requirementSelection.id} className="rounded-lg bg-background p-3">
                        <div className="text-sm font-medium">
                          {requirementSelection.label}
                          {!requirementSelection.required ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span>
                          ) : null}
                        </div>
                        <div className="mt-1 break-all text-xs text-muted-foreground">
                          Expected path: {requirementSelection.uri}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => relatedInputRefs.current[requirementSelection.id]?.click()}
                            disabled={disabled || isPreparingEntry}
                          >
                            {requirementSelection.file ? 'Replace file' : 'Choose file'}
                          </Button>
                          <div className="min-w-0 flex-1 truncate rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            {requirementSelection.file ? requirementSelection.file.name : 'No file selected'}
                          </div>
                          {requirementSelection.file ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => clearRequirementFile(requirementSelection.id)}
                              className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                              aria-label={`Clear ${requirementSelection.uri}`}
                            >
                              <X className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                        <input
                          ref={(element) => {
                            relatedInputRefs.current[requirementSelection.id] = element
                          }}
                          type="file"
                          accept={requirementSelection.accept}
                          onChange={(event) =>
                            handleRequirementFileChange(requirementSelection.id, event)
                          }
                          className="hidden"
                        />
                      </Card>
                    ))}
                  </div>
                ) : entryFile ? (
                  <Card className="rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
                    No additional files are required for this import.
                  </Card>
                ) : null}

                {entryFile && allowAdditionalFiles ? (
                  <Card className="rounded-lg bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">OBJ texture files</div>
                        <p className="text-xs text-muted-foreground">
                          Add image sidecars referenced by the selected MTL files
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => additionalInputRef.current?.click()}
                      >
                        Choose files
                      </Button>
                    </div>
                    {additionalFiles.length > 0 ? (
                      <p className="mt-2 break-all text-xs text-muted-foreground">
                        {additionalFiles.map((file) => file.name).join(', ')}
                      </p>
                    ) : null}
                    <input
                      ref={additionalInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAdditionalFilesChange}
                      className="hidden"
                    />
                  </Card>
                ) : null}
              </Card>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleImport()} disabled={!isImportReady}>
            Import model
          </Button>
        </DialogFooter>

        <input
          ref={entryInputRef}
          type="file"
          accept={selectedFormat?.entryAccept}
          onChange={(event) => void handleEntryFileChange(event)}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  )
}

export { ModelImportDialog }
