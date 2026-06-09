import { getJsonAndSave } from '@/api/downloader';
import { getCacheDirectory, getFileNameFromUrl } from '@/api/utils';
import { logger } from '@/logger';

/**
 * 替换月榜指定 API 路径的域名
 * @param {string} url - 原始 URL
 * @param {string} targetDomain - 目标新域名（例如 'https://new-server.com'）
 * @returns {string} 替换后的 URL
 */
const fixMonthlyApiDomain = (url: string, targetDomain: string): string => {
    const apiPath = '/api/monthlyRanking';

    if (url.includes(apiPath)) {
        return url.replace(/^.*(?=\/api\/monthlyRanking)/, targetDomain);
    }

    return url;
};

async function callAPIAndCacheResponse(url: string, cacheTime: number = 0, retryCount: number = 3): Promise<object> {
  if (url.includes('hhwx.org/api/tracker/data')) {
    url = url.replace('hhwx.org/api/tracker/data', 'hhwx.org/api/bandori/tracker/data');  // HHWX数据源修复
  }
  (await import('dotenv')).config();
  const MONTHLY_DOMAIN = process.env.MONTHLY_DOMAIN;
  if (url.includes('/api/monthlyRanking')) {
      url = fixMonthlyApiDomain(url, MONTHLY_DOMAIN)
  }
  const cacheDir = getCacheDirectory(url);
  const fileName = getFileNameFromUrl(url);
  //console.log('callAPIAndCacheResponse:',url,' cacheTime:',cacheTime)
  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const data = await getJsonAndSave(url, cacheDir, fileName, cacheTime);
      return data;
    } catch (e) {
      if (e && e.response && e.response.status === 404) {
        // 当URL返回404错误后，不再重试，直接抛出错误。
        logger(`API`,`URL "${url}" returned 404 Not Found. No more retries will be made.`);
        throw e
      }
      logger(`API`, `Failed to get JSON from "${url}" on attempt ${attempt + 1}. Error: ${e.message}`);
      if (attempt === retryCount - 1) {
        throw e; // Rethrow the error if all retries fail
      }
      //等待3秒后重试
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  throw new Error(`Failed to get JSON from "${url}" after ${retryCount} attempts`);
}

export { callAPIAndCacheResponse };
