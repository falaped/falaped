import qrcode from "qrcode-generator"

/**
 * QR como SVG inline. SVG e não PNG: escala sem borrar, pesa menos que base64
 * e não precisa de canvas no servidor.
 */
export function renderQrSvg(text: string): string {
  // Tipo 0 = escolhe a menor versão que couber; "M" é a correção de erro que o
  // BR Code usa.
  const qr = qrcode(0, "M")
  qr.addData(text)
  qr.make()

  const count = qr.getModuleCount()
  const cells: string[] = []
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) cells.push(`M${col} ${row}h1v1h-1z`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${count + 2} ${count + 2}" shape-rendering="crispEdges" role="img" aria-label="QR Code do Pix"><rect x="-1" y="-1" width="${count + 2}" height="${count + 2}" fill="#fff"/><path d="${cells.join("")}" fill="#18181b"/></svg>`
}
