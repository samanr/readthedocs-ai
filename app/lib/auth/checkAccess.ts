export const ACCESS_PASSWORD_HEADER = "x-app-password"

export function isAccessAllowed(request: Request): boolean {
  const requiredPassword = process.env.APP_ACCESS_PASSWORD
  if (!requiredPassword) return true

  return request.headers.get(ACCESS_PASSWORD_HEADER) === requiredPassword
}
