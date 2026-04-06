/**
 * Translation Validation Script
 * 
 * This script checks for missing translation keys between locale files.
 * Run with: npx tsx scripts/validate-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCALES_DIR = path.join(__dirname, '../src/locales');

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

function getAllKeys(obj: TranslationObject, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value as TranslationObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function checkDuplicateTopLevelKeys(filename: string): string[] {
  const filePath = path.join(LOCALES_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Find all top-level keys using regex
  const keyRegex = /^\s*"([^"]+)":\s*\{/gm;
  const keys: string[] = [];
  const duplicates: string[] = [];
  let match;
  
  while ((match = keyRegex.exec(content)) !== null) {
    const key = match[1];
    if (keys.includes(key)) {
      duplicates.push(key);
    } else {
      keys.push(key);
    }
  }
  
  return duplicates;
}

function loadLocale(filename: string): TranslationObject {
  const filePath = path.join(LOCALES_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function findMissingKeys(baseKeys: string[], targetKeys: Set<string>): string[] {
  return baseKeys.filter(key => !targetKeys.has(key));
}

function main() {
  console.log('🔍 Translation Validation Script\n');
  console.log('='.repeat(50));
  
  // Get all locale files
  const localeFiles = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  
  console.log(`\n📁 Found ${localeFiles.length} locale files: ${localeFiles.join(', ')}\n`);
  
  // First, check for duplicate keys in all files
  console.log('🔍 Checking for duplicate top-level keys...\n');
  let hasDuplicates = false;
  
  for (const file of localeFiles) {
    const duplicates = checkDuplicateTopLevelKeys(file);
    if (duplicates.length > 0) {
      hasDuplicates = true;
      console.log(`   ❌ ${file}: Duplicate keys found: ${duplicates.join(', ')}`);
    } else {
      console.log(`   ✅ ${file}: No duplicate keys`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Use English as the reference
  const baseLocale = 'en.json';
  const baseTranslations = loadLocale(baseLocale);
  const baseKeys = getAllKeys(baseTranslations);
  
  console.log(`\n📊 Reference file (${baseLocale}): ${baseKeys.length} keys\n`);
  console.log('='.repeat(50));
  
  let hasErrors = hasDuplicates;
  const results: { file: string; missing: string[]; extra: string[] }[] = [];
  
  for (const file of localeFiles) {
    if (file === baseLocale) continue;
    
    const translations = loadLocale(file);
    const keys = getAllKeys(translations);
    const keySet = new Set(keys);
    const baseKeySet = new Set(baseKeys);
    
    const missingKeys = findMissingKeys(baseKeys, keySet);
    const extraKeys = findMissingKeys(keys, baseKeySet);
    
    results.push({ file, missing: missingKeys, extra: extraKeys });
    
    console.log(`\n📄 ${file}:`);
    console.log(`   Total keys: ${keys.length}`);
    
    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`   ✅ All keys present and no extra keys`);
    } else {
      if (missingKeys.length > 0) {
        hasErrors = true;
        console.log(`   ❌ Missing ${missingKeys.length} keys:`);
        missingKeys.slice(0, 10).forEach(key => {
          console.log(`      - ${key}`);
        });
        if (missingKeys.length > 10) {
          console.log(`      ... and ${missingKeys.length - 10} more`);
        }
      }
      
      if (extraKeys.length > 0) {
        console.log(`   ⚠️  Extra ${extraKeys.length} keys (not in ${baseLocale}):`);
        extraKeys.slice(0, 5).forEach(key => {
          console.log(`      + ${key}`);
        });
        if (extraKeys.length > 5) {
          console.log(`      ... and ${extraKeys.length - 5} more`);
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📋 SUMMARY\n');
  
  const totalMissing = results.reduce((sum, r) => sum + r.missing.length, 0);
  const totalExtra = results.reduce((sum, r) => sum + r.extra.length, 0);
  
  if (totalMissing === 0 && totalExtra === 0) {
    console.log('✅ All translations are complete and synchronized!');
  } else {
    if (totalMissing > 0) {
      console.log(`❌ Total missing keys across all files: ${totalMissing}`);
    }
    if (totalExtra > 0) {
      console.log(`⚠️  Total extra keys across all files: ${totalExtra}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Exit with error code if there are missing keys
  if (hasErrors) {
    process.exit(1);
  }
}

main();
