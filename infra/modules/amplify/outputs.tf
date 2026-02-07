output "app_id" {
  value = aws_amplify_app.this.id
}

output "branch_url" {
  value = "https://${aws_amplify_branch.this.branch_name}.${aws_amplify_app.this.default_domain}"
}
