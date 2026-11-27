const USERNAME_MAX = 30

// Sugere um username válido (regra da CHECK users_username_format_check) a
// partir do e-mail: "Pedro.Silva+web@gmail.com" vira "pedro.silva".
export function usernameBaseFromEmail(email: string): string {
  const local = (email.split('@')[0] ?? '').split('+')[0] ?? ''
  let base = local
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .replace(/^[._]+|[._]+$/g, '')

  if (base.length < 3) base = `${base}user`.padEnd(3, '0')

  return base.slice(0, USERNAME_MAX - 4)
}

// Candidatos em ordem: "pedro", "pedro2", "pedro3"...
export function* usernameCandidates(base: string): Generator<string> {
  yield base

  for (let suffix = 2; suffix < 1000; suffix++) yield `${base}${suffix}`
}
