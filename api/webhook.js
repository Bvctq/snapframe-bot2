import sharp from 'sharp';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Gradient presets ────────────────────────────────────────────────────────
const GRADIENTS = [
  { name: 'Purple Dream', colors: ['#667eea', '#764ba2'] },
  { name: 'Pink Flamingo', colors: ['#f093fb', '#f5576c'] },
  { name: 'Ocean Blue',   colors: ['#5eeff1', '#3598fb'] },
  { name: 'Lavender',     colors: ['#a18cd1', '#fbc2eb'] },
  { name: 'Peach',        colors: ['#ffecd2', '#fcb69f'] },
  { name: 'Dark Slate',   colors: ['#0f172a', '#334155'] },
  { name: 'Cyber',        colors: ['#00dbde', '#fc00ff'] },
  { name: 'Sunset',       colors: ['#f6d365', '#fda085'] },
  { name: 'Mint',         colors: ['#84fab0', '#8fd3f4'] },
  { name: 'Soft Sky',     colors: ['#e0c3fc', '#8ec5fc'] },
];

// ─── Solid color palette ──────────────────────────────────────────────────────
const SOLID_COLORS = [
  { name: 'Trắng',      hex: '#ffffff' },
  { name: 'Xám nhạt',  hex: '#f4f4f5' },
  { name: 'Xám',       hex: '#d4d4d8' },
  { name: 'Xám trung', hex: '#a1a1aa' },
  { name: 'Xám đậm',  hex: '#71717a' },
  { name: 'Slate',     hex: '#64748b' },
  { name: 'Xám tối',  hex: '#3f3f46' },
  { name: 'Than',      hex: '#27272a' },
  { name: 'Đen',       hex: '#18181b' },
  { name: 'Navy',      hex: '#1e293b' },
  { name: 'Xanh đêm', hex: '#172554' },
  { name: 'Đỏ',        hex: '#ef4444' },
  { name: 'Cam',       hex: '#f97316' },
  { name: 'Vàng',      hex: '#eab308' },
  { name: 'Xanh lá',  hex: '#22c55e' },
  { name: 'Ngọc',      hex: '#06b6d4' },
  { name: 'Xanh dương',hex: '#3b82f6' },
  { name: 'Tím',       hex: '#8b5cf6' },
];

// ─── Aspect ratios ────────────────────────────────────────────────────────────
const ASPECT_RATIOS = ['auto', '1:1', '4:3', '16:9', '9:16', '21:9'];
const RATIO_LABELS  = { auto: 'Tự động', '1:1': '1:1', '4:3': '4:3', '16:9': '16:9', '9:16': '9:16', '21:9': '21:9' };

// ─── Shadow presets ───────────────────────────────────────────────────────────
const SHADOWS = {
  none: { blur: 0,  offset: 0,  opacity: 0    },
  sm:   { blur: 8,  offset: 4,  opacity: 0.20 },
  md:   { blur: 16, offset: 6,  opacity: 0.25 },
  lg:   { blur: 24, offset: 8,  opacity: 0.30 },
  xl:   { blur: 32, offset: 10, opacity: 0.35 },
  '2xl':{ blur: 48, offset: 14, opacity: 0.40 },
};
const SHADOW_KEYS = ['none', 'sm', 'md', 'lg', 'xl', '2xl'];

// ─── Style presets ────────────────────────────────────────────────────────────
const PRESETS = {
  clean:   { padding: 48,  borderRadius: 12, shadow: 'xl',  showWindowBar: false, backgroundType: 'gradient', gradientIndex: 0 },
  compact: { padding: 20,  borderRadius: 8,  shadow: 'md',  showWindowBar: false, backgroundType: 'gradient', gradientIndex: 2 },
  present: { padding: 64,  borderRadius: 16, shadow: 'xl',  showWindowBar: true,  backgroundType: 'gradient', gradientIndex: 7 },
};

// ─── Allowed chat IDs ─────────────────────────────────────────────────────────
const ALLOWED_IDS = [
  1400175163,
  -1001578007378,
  -1002109878033,
];

// ─── In-memory stores ─────────────────────────────────────────────────────────
const userSettings = new Map(); // userId → settings object
const userWaiting  = new Map(); // userId → 'window_title' | null

function getSettings(userId) {
  return userSettings.get(userId) || {
    backgroundType: 'gradient',
    gradientIndex:  0,
    solidColorIndex: 8,           // Đen
    aspectRatio:    'auto',
    padding:        48,
    borderRadius:   12,
    shadow:         'xl',
    showWindowBar:  false,
    windowTitle:    'Image',
    settingsPage:   1,            // 1=nền+tỷlệ | 2=khung | 3=preset+cửasổ
  };
}

function setSettings(userId, patch) {
  userSettings.set(userId, { ...getSettings(userId), ...patch });
}

// ─── Telegram helpers ─────────────────────────────────────────────────────────
async function callAPI(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId, text, extra = {}) {
  return callAPI('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

async function sendTyping(chatId) {
  return callAPI('sendChatAction', { chat_id: chatId, action: 'upload_photo' });
}

async function downloadImage(fileId) {
  const res  = await fetch(`${API}/getFile?file_id=${fileId}`);
  const { result } = await res.json();
  const file = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${result.file_path}`);
  return Buffer.from(await file.arrayBuffer());
}

async function sendPhoto(chatId, buffer, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'snapframe.png');
  if (caption) form.append('caption', caption);
  await fetch(`${API}/sendPhoto`, { method: 'POST', body: form });
}

async function sendDocument(chatId, buffer, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', new Blob([buffer], { type: 'image/png' }), 'snapframe.png');
  if (caption) form.append('caption', caption);
  await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
}

// ─── Image processing ─────────────────────────────────────────────────────────
async function processImage(buffer, settings) {
  const {
    padding, borderRadius, backgroundType,
    gradientIndex, solidColorIndex,
    aspectRatio, shadow: shadowKey,
    showWindowBar, windowTitle,
  } = settings;

  const gradient   = GRADIENTS[gradientIndex % GRADIENTS.length];
  const solidColor = SOLID_COLORS[solidColorIndex % SOLID_COLORS.length].hex;
  const shadowCfg  = SHADOWS[shadowKey] || SHADOWS.xl;

  // ── Resize source image (cap 2000px) ──
  const MAX = 2000;
  const meta = await sharp(buffer).metadata();
  let srcW = meta.width, srcH = meta.height;

  let resOpts = {};
  if (srcW > MAX || srcH > MAX) resOpts = { width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true };

  const imgBuf = Object.keys(resOpts).length
    ? await sharp(buffer).resize(resOpts).png().toBuffer()
    : await sharp(buffer).png().toBuffer();

  const imgMeta = await sharp(imgBuf).metadata();
  srcW = imgMeta.width; srcH = imgMeta.height;

  // ── Compute inner canvas from aspect ratio ──
  let innerW = srcW, innerH = srcH;
  if (aspectRatio !== 'auto') {
    const [rw, rh] = aspectRatio.split(':').map(Number);
    const targetAspect = rw / rh;
    const srcAspect = srcW / srcH;
    if (srcAspect > targetAspect) {
      innerW = srcW;
      innerH = Math.round(srcW / targetAspect);
    } else {
      innerH = srcH;
      innerW = Math.round(srcH * targetAspect);
    }
  }

  // ── Window bar ──
  const barH = showWindowBar ? 36 : 0;
  const contentH = innerH + barH;

  // ── Compose image onto inner canvas (centered) ──
  const imgLeft = Math.round((innerW - srcW) / 2);
  const imgTop  = barH + Math.round((innerH - srcH) / 2);

  // Window bar SVG
  const winBarSvg = showWindowBar
    ? Buffer.from(
        `<svg width="${innerW}" height="${barH}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${innerW}" height="${barH}" fill="#f5f5f5"/>
          <rect x="0" y="${barH - 1}" width="${innerW}" height="1" fill="#e4e4e7"/>
          <circle cx="16" cy="${barH / 2}" r="5.5" fill="#ff5f57"/>
          <circle cx="32" cy="${barH / 2}" r="5.5" fill="#febc2e"/>
          <circle cx="48" cy="${barH / 2}" r="5.5" fill="#28c840"/>
          <text x="${innerW / 2}" y="${barH / 2 + 4}" text-anchor="middle"
                font-family="system-ui, sans-serif" font-size="11" fill="#71717a">${windowTitle}</text>
        </svg>`
      )
    : null;

  // Background fill for inner canvas (white or transparent)
  const innerBg = backgroundType === 'none'
    ? { r: 0, g: 0, b: 0, alpha: 0 }
    : { r: 255, g: 255, b: 255, alpha: 1 };

  const composites = [];
  if (winBarSvg) composites.push({ input: winBarSvg, top: 0, left: 0 });
  composites.push({ input: imgBuf, top: imgTop, left: imgLeft });

  const framedContent = await sharp({
    create: { width: innerW, height: contentH, channels: 4, background: innerBg },
  }).composite(composites).png().toBuffer();

  // ── Rounded mask ──
  const maskSvg = Buffer.from(
    `<svg width="${innerW}" height="${contentH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${innerW}" height="${contentH}" rx="${borderRadius}" ry="${borderRadius}" fill="white"/>
    </svg>`
  );

  const roundedContent = await sharp(framedContent)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png().toBuffer();

  // ── Canvas with padding ──
  const canvasW = innerW + padding * 2;
  const canvasH = contentH + padding * 2;

  // ── Background SVG ──
  let bgSvg;
  if (backgroundType === 'gradient') {
    const [c1, c2] = gradient.colors;
    bgSvg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect width="${canvasW}" height="${canvasH}" fill="url(#g)"/>
    </svg>`;
  } else if (backgroundType === 'solid') {
    bgSvg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${canvasW}" height="${canvasH}" fill="${solidColor}"/>
    </svg>`;
  } else {
    // none → transparent
    bgSvg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${canvasW}" height="${canvasH}" fill="none"/>
    </svg>`;
  }

  // ── Shadow ──
  const compositesList = [];

  if (shadowCfg.blur > 0) {
    const shadowSvg = Buffer.from(
      `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="sh">
            <feGaussianBlur stdDeviation="${shadowCfg.blur}"/>
            <feColorMatrix type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${shadowCfg.opacity} 0"/>
          </filter>
        </defs>
        <rect x="${padding}" y="${padding + shadowCfg.offset}"
              width="${innerW}" height="${contentH}"
              rx="${borderRadius}" ry="${borderRadius}"
              fill="black" filter="url(#sh)"/>
      </svg>`
    );
    compositesList.push({ input: shadowSvg, blend: 'over' });
  }

  compositesList.push({ input: roundedContent, left: padding, top: padding });

  const bgBuffer = backgroundType === 'none'
    ? await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()
    : Buffer.from(bgSvg);

  const result = await sharp(bgBuffer)
    .composite(compositesList)
    .png().toBuffer();

  return result;
}

// ─── Inline keyboard builder ──────────────────────────────────────────────────
function buildKeyboard(userId) {
  const s = getSettings(userId);
  const page = s.settingsPage || 1;

  const ck  = (v, cur) => cur === v ? `✅ ` : '';
  const grad = GRADIENTS[s.gradientIndex % GRADIENTS.length];
  const solid = SOLID_COLORS[s.solidColorIndex % SOLID_COLORS.length];
  const shadowLabel = s.shadow.toUpperCase();

  // ── Page 1: Nền + Tỷ lệ ──────────────────────────────────────────────────
  if (page === 1) {
    const rows = [
      [
        { text: `🎨 Nền hiện tại: ${s.backgroundType === 'gradient' ? grad.name : s.backgroundType === 'solid' ? solid.name : 'Không nền'}`, callback_data: 'noop' },
      ],
      [
        { text: `${ck('gradient', s.backgroundType)}Gradient`,    callback_data: 'bg:gradient' },
        { text: `${ck('solid', s.backgroundType)}Màu đặc`,        callback_data: 'bg:solid'    },
        { text: `${ck('none', s.backgroundType)}Không nền`,       callback_data: 'bg:none'     },
      ],
      [
        { text: '◀ Gradient', callback_data: 'grad:prev' },
        { text: grad.name,    callback_data: 'noop'      },
        { text: 'Gradient ▶', callback_data: 'grad:next' },
      ],
      [
        { text: '◀ Màu',   callback_data: 'solid:prev' },
        { text: solid.name, callback_data: 'noop'       },
        { text: 'Màu ▶',   callback_data: 'solid:next' },
      ],
      [{ text: '─── Tỷ lệ khung hình ───', callback_data: 'noop' }],
      [
        { text: `${ck('auto', s.aspectRatio)}Tự động`,  callback_data: 'ar:auto' },
        { text: `${ck('1:1', s.aspectRatio)}1:1`,       callback_data: 'ar:1:1'  },
        { text: `${ck('4:3', s.aspectRatio)}4:3`,       callback_data: 'ar:4:3'  },
      ],
      [
        { text: `${ck('16:9', s.aspectRatio)}16:9`,     callback_data: 'ar:16:9' },
        { text: `${ck('9:16', s.aspectRatio)}9:16`,     callback_data: 'ar:9:16' },
        { text: `${ck('21:9', s.aspectRatio)}21:9`,     callback_data: 'ar:21:9' },
      ],
      navRow(page),
    ];
    return { inline_keyboard: rows };
  }

  // ── Page 2: Khung hình ───────────────────────────────────────────────────
  if (page === 2) {
    const rows = [
      [{ text: `─── Padding: ${s.padding}px ───`, callback_data: 'noop' }],
      [
        { text: '➖ 10', callback_data: 'pad:down' },
        { text: `${s.padding}px`, callback_data: 'noop' },
        { text: '➕ 10', callback_data: 'pad:up'   },
      ],
      [{ text: `─── Bo góc: ${s.borderRadius}px ───`, callback_data: 'noop' }],
      [
        { text: '➖ 4', callback_data: 'rad:down' },
        { text: `${s.borderRadius}px`, callback_data: 'noop' },
        { text: '➕ 4', callback_data: 'rad:up'   },
      ],
      [{ text: `─── Đổ bóng: ${shadowLabel} ───`, callback_data: 'noop' }],
      [
        { text: `${ck('none', s.shadow)}Không`,  callback_data: 'sh:none' },
        { text: `${ck('sm', s.shadow)}SM`,        callback_data: 'sh:sm'   },
        { text: `${ck('md', s.shadow)}MD`,        callback_data: 'sh:md'   },
      ],
      [
        { text: `${ck('lg', s.shadow)}LG`,        callback_data: 'sh:lg'   },
        { text: `${ck('xl', s.shadow)}XL`,        callback_data: 'sh:xl'   },
        { text: `${ck('2xl', s.shadow)}2XL`,      callback_data: 'sh:2xl'  },
      ],
      navRow(page),
    ];
    return { inline_keyboard: rows };
  }

  // ── Page 3: Preset + Cửa sổ ─────────────────────────────────────────────
  if (page === 3) {
    const rows = [
      [{ text: '─── Style nhanh ───', callback_data: 'noop' }],
      [
        { text: '🧹 Sạch',        callback_data: 'preset:clean'   },
        { text: '📦 Gọn',         callback_data: 'preset:compact' },
        { text: '📽 Trình chiếu', callback_data: 'preset:present' },
      ],
      [{ text: '🔄 Reset mặc định', callback_data: 'preset:reset' }],
      [{ text: '─── Cửa sổ macOS ───', callback_data: 'noop' }],
      [
        {
          text: s.showWindowBar ? '🪟 Thanh cửa sổ: BẬT' : '🪟 Thanh cửa sổ: TẮT',
          callback_data: 'win:toggle',
        },
      ],
      [{ text: `📝 Tiêu đề: ${s.windowTitle}`, callback_data: 'win:settitle' }],
      [{ text: '─── Xuất file ───', callback_data: 'noop' }],
      [
        { text: '📸 Gửi ảnh (nén)', callback_data: 'noop' },
      ],
      [{ text: '✅ Xong & Lưu',    callback_data: 'settings:close' }],
      navRow(page),
    ];
    return { inline_keyboard: rows };
  }
}

function navRow(page) {
  return [
    { text: page > 1 ? '⬅ Trước' : '　', callback_data: page > 1 ? `page:${page - 1}` : 'noop' },
    { text: `${page}/3`,                   callback_data: 'noop' },
    { text: page < 3 ? 'Tiếp ➡' : '　',   callback_data: page < 3 ? `page:${page + 1}` : 'noop' },
  ];
}

function settingsText(userId) {
  const s    = getSettings(userId);
  const bg   = s.backgroundType === 'gradient'
    ? `Gradient — ${GRADIENTS[s.gradientIndex % GRADIENTS.length].name}`
    : s.backgroundType === 'solid'
    ? `Màu đặc — ${SOLID_COLORS[s.solidColorIndex % SOLID_COLORS.length].name}`
    : 'Không nền (trong suốt)';

  return `⚙️ <b>Cài đặt SnapFrame</b>

🎨 Nền: ${bg}
📐 Tỷ lệ: ${RATIO_LABELS[s.aspectRatio] || s.aspectRatio}
📏 Padding: ${s.padding}px · Bo góc: ${s.borderRadius}px
🌑 Bóng: ${s.shadow.toUpperCase()}
🪟 Cửa sổ: ${s.showWindowBar ? `BẬT — "${s.windowTitle}"` : 'TẮT'}

Trang ${s.settingsPage}/3 — Chỉnh xong nhấn <b>Xong & Lưu</b>, rồi gửi ảnh để áp dụng.`;
}

// ─── Allowed check ────────────────────────────────────────────────────────────
function isAllowed(id) {
  return ALLOWED_IDS.includes(id);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const update = req.body;

  const incomingId =
    update.message?.chat.id ??
    update.callback_query?.message.chat.id ??
    update.channel_post?.chat.id;

  if (!incomingId || !isAllowed(incomingId)) {
    return res.status(200).json({ ok: true });
  }

  // ── Callback queries ────────────────────────────────────────────────────────
  if (update.callback_query) {
    const { id, from, message, data } = update.callback_query;
    const userId = from.id;
    const chatId = message.chat.id;
    const msgId  = message.message_id;
    const s      = getSettings(userId);

    await callAPI('answerCallbackQuery', { callback_query_id: id });

    if (data === 'noop') return res.status(200).json({ ok: true });

    // Background type
    if (data === 'bg:gradient') setSettings(userId, { backgroundType: 'gradient' });
    else if (data === 'bg:solid')    setSettings(userId, { backgroundType: 'solid' });
    else if (data === 'bg:none')     setSettings(userId, { backgroundType: 'none' });

    // Gradient cycle
    else if (data === 'grad:next') setSettings(userId, { gradientIndex: (s.gradientIndex + 1) % GRADIENTS.length });
    else if (data === 'grad:prev') setSettings(userId, { gradientIndex: (s.gradientIndex - 1 + GRADIENTS.length) % GRADIENTS.length });

    // Solid color cycle
    else if (data === 'solid:next') setSettings(userId, { solidColorIndex: (s.solidColorIndex + 1) % SOLID_COLORS.length });
    else if (data === 'solid:prev') setSettings(userId, { solidColorIndex: (s.solidColorIndex - 1 + SOLID_COLORS.length) % SOLID_COLORS.length });

    // Aspect ratio
    else if (data.startsWith('ar:')) setSettings(userId, { aspectRatio: data.slice(3) });

    // Padding
    else if (data === 'pad:up')   setSettings(userId, { padding: Math.min(s.padding + 10, 120) });
    else if (data === 'pad:down') setSettings(userId, { padding: Math.max(s.padding - 10, 10)  });

    // Border radius
    else if (data === 'rad:up')   setSettings(userId, { borderRadius: Math.min(s.borderRadius + 4, 48) });
    else if (data === 'rad:down') setSettings(userId, { borderRadius: Math.max(s.borderRadius - 4, 0)  });

    // Shadow
    else if (data.startsWith('sh:')) setSettings(userId, { shadow: data.slice(3) });

    // Window bar
    else if (data === 'win:toggle') setSettings(userId, { showWindowBar: !s.showWindowBar });
    else if (data === 'win:settitle') {
      userWaiting.set(userId, 'window_title');
      await sendMessage(chatId, '✏️ Nhập tiêu đề cho cửa sổ (gửi 1 dòng văn bản):');
      return res.status(200).json({ ok: true });
    }

    // Presets
    else if (data === 'preset:clean')   setSettings(userId, { ...PRESETS.clean });
    else if (data === 'preset:compact') setSettings(userId, { ...PRESETS.compact });
    else if (data === 'preset:present') setSettings(userId, { ...PRESETS.present });
    else if (data === 'preset:reset')   userSettings.delete(userId);

    // Page navigation
    else if (data.startsWith('page:')) setSettings(userId, { settingsPage: Number(data.slice(5)) });

    // Done
    else if (data === 'settings:close') {
      await callAPI('editMessageText', {
        chat_id: chatId, message_id: msgId,
        text: '✅ Đã lưu cài đặt! Gửi ảnh để áp dụng nhé 🎨',
        parse_mode: 'HTML',
      });
      return res.status(200).json({ ok: true });
    }

    // Re-render settings message
    await callAPI('editMessageText', {
      chat_id:      chatId,
      message_id:   msgId,
      text:         settingsText(userId),
      parse_mode:   'HTML',
      reply_markup: buildKeyboard(userId),
    });

    return res.status(200).json({ ok: true });
  }

  // ── Channel posts ───────────────────────────────────────────────────────────
  if (update.channel_post) {
    await handleChannelPost(update.channel_post);
    return res.status(200).json({ ok: true });
  }

  const message = update.message;
  if (!message) return res.status(200).json({ ok: true });

  const chatId = message.chat.id;
  const userId = message.from?.id;
  const text   = message.text?.trim();

  // ── Waiting for window title input ──────────────────────────────────────────
  if (userWaiting.get(userId) === 'window_title' && text && !text.startsWith('/')) {
    userWaiting.delete(userId);
    setSettings(userId, { windowTitle: text.slice(0, 40) });
    await sendMessage(chatId, `✅ Đã đặt tiêu đề cửa sổ: <b>${text.slice(0, 40)}</b>\nDùng /settings để tiếp tục chỉnh hoặc gửi ảnh ngay.`);
    return res.status(200).json({ ok: true });
  }

  // ── /start ──────────────────────────────────────────────────────────────────
  if (text === '/start') {
    await sendMessage(chatId,
      `👋 Xin chào! Mình là <b>SnapFrame Bot</b> 🖼️\n\n` +
      `Gửi cho mình một ảnh bất kỳ, mình sẽ:\n` +
      `• 🎨 Thêm nền gradient / màu đặc / trong suốt\n` +
      `• 📐 Đặt tỷ lệ khung hình (16:9, 1:1...)\n` +
      `• ✂️ Bo tròn góc ảnh\n` +
      `• 🌑 Thêm đổ bóng đẹp\n` +
      `• 🪟 Giả lập thanh cửa sổ macOS\n\n` +
      `<b>Lệnh:</b>\n` +
      `/settings — Mở bảng tuỳ chỉnh style\n` +
      `/download — Gửi lại ảnh dạng file PNG gốc\n` +
      `/help — Hướng dẫn chi tiết`
    );
    return res.status(200).json({ ok: true });
  }

  // ── /settings ───────────────────────────────────────────────────────────────
  if (text === '/settings') {
    setSettings(userId, { settingsPage: 1 });
    await callAPI('sendMessage', {
      chat_id:      chatId,
      text:         settingsText(userId),
      parse_mode:   'HTML',
      reply_markup: buildKeyboard(userId),
    });
    return res.status(200).json({ ok: true });
  }

  // ── /help ────────────────────────────────────────────────────────────────────
  if (text === '/help') {
    await sendMessage(chatId,
      `📖 <b>Hướng dẫn SnapFrame Bot</b>\n\n` +
      `1. Gửi ảnh → bot tự động frame ảnh\n` +
      `2. /settings → tuỳ chỉnh trước khi gửi ảnh\n` +
      `3. /download → nhận file PNG chất lượng cao\n\n` +
      `<b>Trang 1 — Nền & Tỷ lệ</b>\n` +
      `• Gradient: 10 màu gradient đẹp\n` +
      `• Màu đặc: 18 màu tuỳ chọn\n` +
      `• Không nền: xuất PNG trong suốt\n` +
      `• Tỷ lệ: Auto / 1:1 / 4:3 / 16:9 / 9:16 / 21:9\n\n` +
      `<b>Trang 2 — Khung hình</b>\n` +
      `• Padding: 10–120px\n` +
      `• Bo góc: 0–48px\n` +
      `• Bóng: Không / SM / MD / LG / XL / 2XL\n\n` +
      `<b>Trang 3 — Preset & Cửa sổ</b>\n` +
      `• Style nhanh: Sạch / Gọn / Trình chiếu\n` +
      `• Thanh cửa sổ macOS giả với tiêu đề tuỳ chỉnh\n\n` +
      `<i>💡 Mẹo: Ảnh screenshot trông đặc biệt đẹp với preset Trình chiếu!</i>`
    );
    return res.status(200).json({ ok: true });
  }

  // ── Photo or image document ──────────────────────────────────────────────────
  const isPhoto = message.photo || message.document?.mime_type?.startsWith('image/');
  const isDownload = text === '/download';

  if (isPhoto) {
    await sendTyping(chatId);
    try {
      const fileId = message.photo
        ? message.photo[message.photo.length - 1].file_id
        : message.document.file_id;

      const imgBuffer = await downloadImage(fileId);
      const settings  = getSettings(userId);
      const processed = await processImage(imgBuffer, settings);

      const s       = settings;
      const bgLabel = s.backgroundType === 'gradient'
        ? GRADIENTS[s.gradientIndex % GRADIENTS.length].name
        : s.backgroundType === 'solid'
        ? SOLID_COLORS[s.solidColorIndex % SOLID_COLORS.length].name
        : 'Trong suốt';

      const caption = `✨ <b>SnapFrame</b> — ${bgLabel} • ${s.padding}px • r${s.borderRadius} • ${s.shadow.toUpperCase()}`;

      // Send both compressed photo and full PNG file
      await sendPhoto(chatId, processed, caption);
      await sendDocument(chatId, processed, '📥 File PNG chất lượng cao');
    } catch (err) {
      console.error('Processing error:', err);
      await sendMessage(chatId, `❌ Có lỗi khi xử lý ảnh:\n<code>${err.message}</code>`);
    }
    return res.status(200).json({ ok: true });
  }

  // ── Unhandled text ───────────────────────────────────────────────────────────
  if (text && !text.startsWith('/')) {
    await sendMessage(chatId, '📸 Gửi ảnh cho mình nhé! Dùng /settings để tuỳ chỉnh style trước.');
  }

  return res.status(200).json({ ok: true });
}

// ─── Channel post handler ─────────────────────────────────────────────────────
async function handleChannelPost(post) {
  if (!post.photo && !post.document?.mime_type?.startsWith('image/')) return;

  const chatId = post.chat.id;
  const msgId  = post.message_id;

  try {
    const fileId = post.photo
      ? post.photo[post.photo.length - 1].file_id
      : post.document.file_id;

    const imgBuffer = await downloadImage(fileId);
    const processed = await processImage(imgBuffer, {
      padding:        40,
      borderRadius:   24,
      backgroundType: 'solid',
      gradientIndex:  0,
      solidColorIndex: 9, // Navy
      aspectRatio:    'auto',
      shadow:         'xl',
      showWindowBar:  false,
      windowTitle:    'Image',
    });

    const form = new FormData();
    form.append('chat_id',    String(chatId));
    form.append('message_id', String(msgId));
    const mediaJson = { type: 'photo', media: 'attach://photo' };
    if (post.caption) {
      mediaJson.caption = post.caption;
      if (post.caption_entities) mediaJson.caption_entities = post.caption_entities;
    }
    form.append('media', JSON.stringify(mediaJson));
    form.append('photo', new Blob([processed], { type: 'image/png' }), 'framed.png');

    await fetch(`${API}/editMessageMedia`, { method: 'POST', body: form });
  } catch (err) {
    console.error('Channel post error:', err);
  }
}
