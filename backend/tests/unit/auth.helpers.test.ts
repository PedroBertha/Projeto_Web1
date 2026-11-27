import { describe, expect, it } from 'vitest'
import { buildConfirmationEmail } from '../../src/modules/auth/auth.emails.js'
import {
  usernameBaseFromEmail,
  usernameCandidates,
} from '../../src/modules/auth/username.js'

describe('Username gerado a partir do e-mail', () => {
  it.each([
    ['pedro@gmail.com', 'pedro'],
    ['Pedro.Silva+web@gmail.com', 'pedro.silva'],
    ['joão-maria@x.com', 'joaomaria'],
    ['.ana_@x.com', 'ana'],
    ['a@x.com', 'auser'],
    ['--@x.com', 'user'],
    [`${'a'.repeat(40)}@x.com`, 'a'.repeat(26)],
  ])('%s vira %s', (email, expected) => {
    const base = usernameBaseFromEmail(email)
    expect(base).toBe(expected)
    expect(`${base}999`).toMatch(/^[a-z0-9_.]{3,30}$/)
  })

  it('sugere sufixos numericos em ordem', () => {
    const candidates = usernameCandidates('pedro')
    expect([...Array(3)].map(() => candidates.next().value)).toEqual([
      'pedro',
      'pedro2',
      'pedro3',
    ])
  })
})

describe('E-mail de confirmacao', () => {
  it('inclui o link no texto e no HTML, escapando o nome', () => {
    const message = buildConfirmationEmail({
      to: 'pedro@example.com',
      name: '<b>Pedro</b>',
      confirmUrl: 'http://localhost:5173/confirmar-email?token=abc&x=1',
    })

    expect(message.subject).toBe('Confirme seu e-mail no Nexo')
    expect(message.text).toContain('Equipe Nexo')
    expect(message.html).toContain('Nexo')
    expect(message.text).toContain(
      'http://localhost:5173/confirmar-email?token=abc&x=1',
    )
    expect(message.html).toContain('&lt;b&gt;Pedro&lt;/b&gt;')
    expect(message.html).not.toContain('<b>Pedro</b>')
    expect(message.html).toContain('token=abc&amp;x=1')
  })
})
