/**
 * Sensitive word filter for content moderation
 * Basic keyword list for client-side pre-check
 * Backend maintains the authoritative list; this is a first-pass filter
 */

// Sensitive word categories
const SENSITIVE_WORDS = [
  // Political sensitivity (examples - expand as needed)
  '政治敏感词1', '政治敏感词2',

  // Pornographic content
  '色情', '裸照', '性暗示',

  // Violence
  '暴力', '血腥', '恐怖主义',

  // Spam / advertising
  '加微信', '加QQ', '免费领取', '点击链接', '扫码领取',

  // Personal attacks
  '人身攻击词1',
]

/**
 * Check if text contains sensitive words
 * @param {string} text
 * @returns {{ pass: boolean, word: string|null }}
 */
export function checkSensitiveWords(text) {
  if (!text) return { pass: true, word: null }

  const lower = text.toLowerCase()
  for (const word of SENSITIVE_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return { pass: false, word }
    }
  }
  return { pass: true, word: null }
}

/**
 * Replace sensitive words with asterisks
 * @param {string} text
 * @returns {string}
 */
export function maskSensitiveWords(text) {
  if (!text) return text

  let result = text
  for (const word of SENSITIVE_WORDS) {
    const regex = new RegExp(word, 'gi')
    result = result.replace(regex, '*'.repeat(word.length))
  }
  return result
}
