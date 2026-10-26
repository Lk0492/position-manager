import { filingConfig, isFilingVisible } from "../config/site";
import styles from "./SiteFooter.module.css";

/** A standalone footer with site-wide configuration and per-link visibility. */
export default function SiteFooter() {
  const showFiling = isFilingVisible(
    filingConfig.enabled,
    window.location.search,
  );

  return (
    <footer className={styles.footer}>
      <div className={styles.summary}>
        <span>
          仓位管理器 <span className={styles.dot}>·</span> 精准计算，理性交易
          <small className={styles.version}>版本 {__APP_VERSION__}</small>
        </span>
        <span>所有数据保存在当前浏览器，请定期导出备份。</span>
      </div>
      {showFiling && (
        <div className={styles.filing} aria-label="网站备案信息">
          <a href={filingConfig.url} target="_blank" rel="noopener noreferrer">
            {filingConfig.number}
          </a>
        </div>
      )}
    </footer>
  );
}
