#!/usr/bin/env node
/**
 * MWC 2026 新闻抓取脚本
 * 使用 Exa AI 搜索真实新闻
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'news.json');

const EXA_API_KEY = process.env.EXA_API_KEY || '';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 使用 Exa AI 搜索真实新闻
 */
async function fetchNewsFromExa() {
  console.log('🔍 使用 Exa AI 搜索 MWC 2026 相关新闻...');
  
  if (!EXA_API_KEY) {
    console.log('⚠️ 未配置 EXA_API_KEY，跳过抓取');
    return [];
  }
  
  try {
    // 使用 mcporter 调用 Exa 搜索
    const { execSync } = await import('child_process');
    
    const result = execSync(
      `mcporter call 'exa.web_search_exa(query: "MWC 2026 mobile world congress agent AI", numResults: 10)'`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    
    const searchResults = JSON.parse(result);
    const articles = [];
    
    if (searchResults && searchResults.results) {
      for (const item of searchResults.results) {
        // 使用 Jina Reader 获取摘要
        let summary = item.text || item.snippet || '';
        if (summary.length > 200) {
          summary = summary.substring(0, 200) + '...';
        }
        
        // 判断分类
        const title = item.title || '';
        const text = (item.text || '').toLowerCase();
        let category = 'Mobile';
        if (title.includes('AI') || text.includes('artificial intelligence')) category = 'AI';
        else if (title.includes('5G') || text.includes('5g')) category = '5G';
        else if (title.includes('IoT') || text.includes('internet of things')) category = 'IoT';
        else if (title.includes('cloud')) category = 'Cloud';
        else if (title.includes('security') || text.includes('security')) category = 'Security';
        
        articles.push({
          id: item.id || Date.now().toString() + Math.random(),
          title: title,
          summary: summary,
          source: item.source || new URL(item.url).hostname.replace('www.', ''),
          date: getTodayString(),
          category: category,
          url: item.url
        });
      }
    }
    
    console.log(`✅ 成功抓取 ${articles.length} 条真实新闻`);
    return articles;
    
  } catch (error) {
    console.error('❌ Exa 抓取失败:', error.message);
    return [];
  }
}

async function updateNewsData() {
  try {
    let existingData;
    try {
      const content = await fs.readFile(DATA_PATH, 'utf-8');
      existingData = JSON.parse(content);
    } catch {
      existingData = { news: [], lastUpdated: '', totalCount: 0 };
    }
    
    // 抓取真实新闻
    const newArticles = await fetchNewsFromExa();
    
    // 合并并去重
    const existingUrls = new Set(existingData.news.map(n => n.url));
    const uniqueNewArticles = newArticles.filter(n => !existingUrls.has(n.url));
    
    const updatedNews = [...uniqueNewArticles, ...existingData.news];
    const trimmedNews = updatedNews.slice(0, 50);
    
    const updatedData = {
      lastUpdated: getTodayString(),
      totalCount: trimmedNews.length,
      news: trimmedNews
    };
    
    await fs.writeFile(DATA_PATH, JSON.stringify(updatedData, null, 2), 'utf-8');
    
    console.log('✅ 新闻数据更新成功！');
    console.log(`📊 新增: ${uniqueNewArticles.length} 条`);
    console.log(`📊 总计: ${trimmedNews.length} 条`);
    console.log(`🕐 更新时间: ${updatedData.lastUpdated}`);
    
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🤖 MWC 2026 Agent News 抓取服务');
  console.log('================================');
  console.log('');
  
  await updateNewsData();
}

main();
