# ---------- Secrets Manager ----------

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}/${var.environment}/app-secrets"
  recovery_window_in_days = 7

  tags = { Name = "${var.project_name}-app-secrets" }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    DATABASE_URL            = local.database_url
    REDIS_URL               = local.redis_url
    AUTH_SECRET             = var.auth_secret
    AUTH_GOOGLE_ID          = var.auth_google_id
    AUTH_GOOGLE_SECRET      = var.auth_google_secret
    RESEND_API_KEY          = var.resend_api_key
    EMAIL_FROM              = var.email_from
    TWILIO_ACCOUNT_SID      = var.twilio_account_sid
    TWILIO_AUTH_TOKEN        = var.twilio_auth_token
    TWILIO_PHONE_NUMBER     = var.twilio_phone_number
    STRIPE_SECRET_KEY       = var.stripe_secret_key
    STRIPE_PUBLISHABLE_KEY  = var.stripe_publishable_key
    STRIPE_WEBHOOK_SECRET   = var.stripe_webhook_secret
    STRIPE_PRICE_ID_MONTHLY = var.stripe_price_id_monthly
    STRIPE_PRICE_ID_YEARLY  = var.stripe_price_id_yearly
    ENCRYPTION_KEY          = var.encryption_key
  })
}
