/* Content Security Policy i två varianter.
 *
 * Enfilsversionen är avsiktligt hårdspänd: default-src 'none' och inget
 * 'self' någonstans, eftersom allt ligger inbäddat och ingenting ska hämtas.
 * Den serverade versionen måste få hämta sina egna filer och får därför
 * 'self' tillagt — men bara den.
 */
export const CSP_STRICT = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; connect-src data: blob:; worker-src blob:; child-src blob:; object-src 'none'; base-uri 'none'`;
export const CSP_SERVED = `default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'none'`;
