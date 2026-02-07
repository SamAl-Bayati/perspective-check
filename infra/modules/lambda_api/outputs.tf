output "lambda_function_name" {
  value = aws_lambda_function.this.function_name
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.this.api_endpoint
}

output "lambda_log_group_name" {
  value = aws_cloudwatch_log_group.lambda.name
}

output "api_access_log_group_name" {
  value = aws_cloudwatch_log_group.apigateway.name
}
