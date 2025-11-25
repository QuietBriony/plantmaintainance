'use strict';

/**
 * Garden-QA Engine
 * - JSON DB（GitHub Raw）を“唯一の正”として参照
 * - fetch には cache:'no-store' を必ず付与
 * - UI は純粋な HTML + JS（サーバ不要）
 */

/**
 * DB の取得先
 * GitHub 反映後は、必要に応じて Raw URL に差し替えてください。
 *
 * 例:
 * const GARDEN_DB_URL =
 *   'https://raw.githubusercontent.com/your-account/your-repo/main/garden-db.json';
 */
const GARDEN_DB_URL = './garden-db.json';

let gardenDB = null;
let isLoadingDB = false;

/**
 * DOM 要素キャッシュ
 */
const els = {
  dbStatus: null,
  questionForm: null,
  questionInput: null,
  askButton: null,
  loadingIndicator: null,
  answerOutput: null,
  candidatesOutput: null,
  dbSourceLabel: null
};

document.addEventListener('DOMContentLoaded', () => {
  // 要素の紐付け
  els.dbStatus = document.getElementById('db-status');
  els.questionForm = document.getElementById('question-form');
  els.questionInput = document.getElementById('question-input');
  els.askButton = document.getElementById('ask-button');
  els.loadingIndicator = document.getElementById('loading-indicator');
  els.answerOutput = document.getElementById('answer-output');
  els.candidatesOutput = document.getElementById('candidates-output');
  els.dbSourceLabel = document.getElementById('db-source-label');

  if (els.dbSourceLabel) {
    els.dbSourceLabel.textContent = `garden-db.json（${GARDEN_DB_URL}）`;
  }

  // DB 読み込み
  loadGardenDB();

  // フォーム送信
  if (els.questionForm) {
    els.questionForm.addEventListener('submit', handleQuestionSubmit);
  }
});

/**
 * garden-db.json を GitHub Raw（または相対パス）から取得
 * cache:'no-store' を明示指定してローカルキャッシュを抑止
 */
async function loadGardenDB() {
  if (isLoadingDB) return;
  isLoadingDB = true;
  updateDBStatus('DB読み込み中...', 'loading');

  try {
    const res = await fetch(GARDEN_DB_URL, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`DB取得に失敗しました: HTTP ${res.status}`);
    }

    const json = await res.json();
    gardenDB = normalizeGardenDB(json);

    const meta = gardenDB.meta || {};
    const version = meta.version || 'unknown';
    const updated = meta.updated_at || 'unknown';

    updateDBStatus(
      `DB読み込み完了（version: ${version} / updated: ${updated}）`,
      'ok'
    );
  } catch (err) {
    console.error(err);
    gardenDB = null;
    updateDBStatus(
      'DBの読み込みに失敗しました。ネットワーク状況と URL を確認してください。',
      'error'
    );
  } finally {
    isLoadingDB = false;
  }
}

/**
 * garden-db.json の最低限の正規化
 */
function normalizeGardenDB(raw) {
  const db = raw || {};
  db.meta = db.meta || {};
  db.faqs = Array.isArray(db.faqs) ? db.faqs : [];
  return db;
}

/**
 * DB 状態表示を更新
 */
function updateDBStatus(message, status) {
  if (!els.dbStatus) return;
  els.dbStatus.textContent = message;
  els.dbStatus.dataset.status = status || '';
}

/**
 * 質問フォーム送信ハンドラ
 */
function handleQuestionSubmit(event) {
  event.preventDefault();
  const text = (els.questionInput?.value || '').trim();

  if (!text) {
    renderAnswerPlaceholder('質問文が空です。内容を入力してください。');
    renderCandidates([]);
    return;
  }

  if (!gardenDB || !Array.isArray(gardenDB.faqs)) {
    renderAnswerPlaceholder(
      'DB が読み込まれていません。しばらく待ってから再度お試しください。'
    );
    renderCandidates([]);
    return;
  }

  setLoading(true);
  window.requestAnimationFrame(() => {
    const result = findBestMatches(text, gardenDB.faqs);
    renderAnswer(result.best, text);
    renderCandidates(result.candidates);
    setLoading(false);
  });
}

/**
 * ローディング状態の UI 更新
 */
function setLoading(isLoading) {
  if (els.askButton) {
    els.askButton.disabled = isLoading;
  }
  if (els.loadingIndicator) {
    els.loadingIndicator.textContent = isLoading ? '照会中...' : '';
  }
}

/**
 * ユーザー質問に対して、DB 内からスコアリング検索
 * - 非常にシンプルなキーワード一致ベース
 * - 将来的に形態素解析・ベクトル検索に差し替え可能な構造
 */
function findBestMatches(questionText, faqs) {
  const q = normalizeText(questionText);
  const keywords = extractKeywords(q);

  const scored = faqs
    .map((faq) => {
      const score = scoreFAQ(faq, keywords);
      return { faq, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored.length > 0 ? scored[0] : null;

  // 上位 3 件を候補として出力
  const candidates = scored.slice(0, 3);

  return { best, candidates };
}

/**
 * FAQ 1件に対するスコア評価
 */
function scoreFAQ(faq, keywords) {
  if (!faq) return 0;
  const targetText =
    normalizeText(faq.question || '') +
    ' ' +
    normalizeText(faq.answer || '') +
    ' ' +
    normalizeText((faq.tags || []).join(' '));

  if (!targetText) return 0;

  let score = 0;

  for (const kw of keywords) {
    if (!kw) continue;
    if (targetText.includes(kw)) {
      score += 3; // 基本ポイント
    }
  }

  // ざっくりした長さペナルティ（長すぎるQAを少しだけ減点）
  const lengthPenalty = Math.max(0, Math.floor(targetText.length / 400));
  score -= lengthPenalty;

  return score;
}

/**
 * テキスト正規化（ひらがな・カタカナ統合などは後続の拡張ポイント）
 */
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 簡易キーワード抽出
 * - 現状は空白区切りのみ
 * - 将来、形態素解析エンジンに差し替え予定の差し替えポイント
 */
function extractKeywords(normalizedText) {
  if (!normalizedText) return [];
  return normalizedText.split(' ').filter((x) => x.length > 0);
}

/**
 * 回答表示（ベストマッチ）
 */
function renderAnswer(bestItem, originalQuestion) {
  if (!els.answerOutput) return;

  if (!bestItem) {
    els.answerOutput.innerHTML = `
      <div class="answer-block answer-empty">
        <p>DB内に近い回答候補が見つかりませんでした。</p>
        <p class="hint">
          ・質問文をもう少し具体的にしてみてください。<br />
          ・キーワード（例：芝生・台風・潮風・雑草対策 など）を含めるとマッチしやすくなります。
        </p>
      </div>
    `;
    return;
  }

  const faq = bestItem.faq;
  const score = bestItem.score;

  els.answerOutput.innerHTML = `
    <article class="answer-block">
      <header class="answer-header">
        <h3 class="answer-title">推定ベストマッチ</h3>
        <div class="answer-meta">
          <span class="answer-id">ID: ${escapeHTML(faq.id || '')}</span>
          <span class="answer-score">Score: ${score}</span>
        </div>
      </header>
      <section class="answer-question">
        <h4>DB側の質問</h4>
        <p>${escapeHTML(faq.question || '')}</p>
      </section>
      <section class="answer-body">
        <h4>回答</h4>
        <p>${escapeHTML(faq.answer || '')}</p>
      </section>
      ${
        faq.tags && faq.tags.length
          ? `<section class="answer-tags">
               <h4>タグ</h4>
               <ul class="tag-list">
                 ${faq.tags
                   .map(
                     (t) =>
                       `<li class="tag-item">${escapeHTML(String(t))}</li>`
                   )
                   .join('')}
               </ul>
             </section>`
          : ''
      }
      <footer class="answer-footer">
        <h4>あなたの質問</h4>
        <p>${escapeHTML(originalQuestion || '')}</p>
        <p class="hint">
          ※ 現在はキーワード一致のみでマッチングしています。将来的に精度改善予定です。
        </p>
      </footer>
    </article>
  `;
}

/**
 * 候補一覧表示（上位3件）
 */
function renderCandidates(candidates) {
  if (!els.candidatesOutput) return;

  if (!candidates || candidates.length === 0) {
    els.candidatesOutput.innerHTML = `
      <p class="placeholder">
        関連候補がありません。
      </p>
    `;
    return;
  }

  const listHtml = candidates
    .map((item) => {
      const faq = item.faq;
      return `
        <li class="candidate-item">
          <div class="candidate-header">
            <span class="candidate-id">ID: ${escapeHTML(faq.id || '')}</span>
            <span class="candidate-score">Score: ${item.score}</span>
          </div>
          <div class="candidate-question">
            ${escapeHTML(faq.question || '')}
          </div>
          ${
            faq.tags && faq.tags.length
              ? `<div class="candidate-tags">
                   ${faq.tags
                     .map(
                       (t) =>
                         `<span class="tag-pill">${escapeHTML(String(t))}</span>`
                     )
                     .join('')}
                 </div>`
              : ''
          }
        </li>
      `;
    })
    .join('');

  els.candidatesOutput.innerHTML = `
    <ul class="candidate-list">
      ${listHtml}
    </ul>
  `;
}

/**
 * エラーメッセージ等をシンプルに表示
 */
function renderAnswerPlaceholder(message) {
  if (!els.answerOutput) return;
  els.answerOutput.innerHTML = `
    <div class="answer-block answer-empty">
      <p>${escapeHTML(message || '')}</p>
    </div>
  `;
}

/**
 * XSS 対策用の簡易エスケープ
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}