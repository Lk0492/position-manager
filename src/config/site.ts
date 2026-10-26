/** Site-wide filing settings. Run ./deploy/deploy.sh after changing this file. */
export const filingConfig = {
  enabled: true,
  number: "桂ICP备2026024052号",
  url: "https://beian.miit.gov.cn/",
};

/** Per-link visibility never overrides the site-wide disabled setting. */
export function isFilingVisible(enabled: boolean, search: string): boolean {
  return enabled && new URLSearchParams(search).get("filing") !== "0";
}
