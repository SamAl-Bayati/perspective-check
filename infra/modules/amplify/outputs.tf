output "app_id" {
  value = aws_amplify_app.this.id
}

output "primary_branch_url" {
  value = try("https://${aws_amplify_branch.this[var.primary_branch_name].branch_name}.${aws_amplify_app.this.default_domain}", null)
}

output "branch_urls" {
  value = {
    for branch_name, branch in aws_amplify_branch.this :
    branch_name => "https://${branch.branch_name}.${aws_amplify_app.this.default_domain}"
  }
}
