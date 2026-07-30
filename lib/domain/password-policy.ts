const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_LENGTH = 128

export function validatePassword(password: string) {
  const issues: string[] = []
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    issues.push("length")
  }
  if (!/[A-Z]/.test(password)) issues.push("uppercase")
  if (!/[a-z]/.test(password)) issues.push("lowercase")
  if (!/\d/.test(password)) issues.push("number")
  return { valid: issues.length === 0, issues }
}
