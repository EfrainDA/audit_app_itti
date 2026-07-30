import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

type Oklch = [lightness: number, chroma: number, hue: number]

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8")

function getBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`No se encontró el bloque ${selector}`)
  return match[1]
}

function getOklch(block: string, token: string): Oklch {
  const match = block.match(new RegExp(`--${token}:\\s*oklch\\((\\d*\\.?\\d+)\\s+(\\d*\\.?\\d+)\\s+(\\d*\\.?\\d+)`))
  if (!match) throw new Error(`No se encontró el token --${token}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function relativeLuminance([lightness, chroma, hue]: Oklch) {
  const radians = hue * Math.PI / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3)
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(first: Oklch, second: Oklch) {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
}

describe("tokens visuales", () => {
  it.each([":root", ".dark"])("mantiene contraste AA en estados semánticos para %s", (selector) => {
    const block = getBlock(selector)

    for (const status of ["success", "warning", "danger", "info"]) {
      const text = getOklch(block, `status-${status}-text`)
      const surface = getOklch(block, `status-${status}-surface`)
      expect(contrast(text, surface), `${selector} ${status}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("define tres niveles de elevación y conserva opacidades oscuras", () => {
    const root = getBlock(":root")
    expect(root).toContain("--elevation-1:")
    expect(root).toContain("--elevation-2:")
    expect(root).toContain("--elevation-3:")
    expect(css).not.toContain(".dark .bg-secondary\\/35")
    expect(css).not.toContain(".dark .bg-muted\\/20")
  })
})
