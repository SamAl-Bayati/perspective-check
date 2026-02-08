output "app_id" {
  value = aws_amplify_app.this.id
}

output "primary_branch_url" {
  value = "https://${aws_amplify_branch.this.branch_name}.${aws_amplify_app.this.default_domain}"
}

output "branch_urls" {
  value = merge(
    {
      (aws_amplify_branch.this.branch_name) = "https://${aws_amplify_branch.this.branch_name}.${aws_amplify_app.this.default_domain}"
    },
    {
      for branch_name, branch in aws_amplify_branch.additional :
      branch_name => "https://${branch.branch_name}.${aws_amplify_app.this.default_domain}"
    }
  )
}
