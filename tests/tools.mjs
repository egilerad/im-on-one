let tools;
try { tools=await import('playwright'); }
catch {
  const path=process.env.PLAYWRIGHT_MODULE;
  if(!path)throw new Error('Install Playwright locally: npm install --no-save playwright && npx playwright install chromium');
  tools=await import(path);
}
export const chromium=tools.chromium;
