import type { SePayTier } from "./sepay.service.js";

export interface SePayPaymentPageProps {
  tier: SePayTier;
  qrUrl: string;
  amount: number;
  bankLabel: string;
  referenceCode: string;
  transactionId: string;
  paidLabel: string;
}

export function renderSePayPaymentPage(props: SePayPaymentPageProps): string {
  return `<!doctype html>
  <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Thanh toán SePay</title>
      <style>
        :root { color-scheme: dark; }
        body {
          margin: 0;
          min-height: 100vh;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          background: radial-gradient(circle at top, rgba(99,102,241,.25), transparent 30%),
                      linear-gradient(180deg, #09090b 0%, #111827 100%);
          color: #f4f4f5;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .card {
          width: min(100%, 560px);
          background: rgba(24, 24, 27, .92);
          border: 1px solid rgba(63, 63, 70, .9);
          border-radius: 28px;
          padding: 28px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, .45);
        }
        .badge {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(79, 70, 229, .16);
          color: #c7d2fe;
          font-size: 12px;
          font-weight: 700;
        }
        h1 { margin: 14px 0 8px; font-size: 28px; }
        p { margin: 6px 0; color: #d4d4d8; line-height: 1.6; }
        .qr {
          margin: 24px 0;
          padding: 18px;
          border-radius: 24px;
          background: #fff;
          display: grid;
          place-items: center;
        }
        .details {
          display: grid;
          gap: 10px;
          margin-top: 18px;
          padding: 16px;
          border-radius: 20px;
          background: rgba(39, 39, 42, .85);
          border: 1px solid rgba(63, 63, 70, .7);
          font-size: 14px;
        }
        .row { display: flex; justify-content: space-between; gap: 16px; }
        .label { color: #a1a1aa; }
        .value { text-align: right; font-weight: 700; color: #fafafa; word-break: break-word; }
        .hint {
          margin-top: 18px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(59, 130, 246, .12);
          color: #dbeafe;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <main class="card">
        <span class="badge">${props.paidLabel}</span>
        <h1>Thanh toán bằng SePay</h1>
        <p>Quét QR bên dưới bằng ứng dụng ngân hàng để hoàn tất nâng cấp gói ${props.tier}.</p>
        <div class="qr">
          <img src="${props.qrUrl}" alt="QR thanh toán SePay" width="320" height="320" />
        </div>
        <div class="details">
          <div class="row"><span class="label">Số tiền</span><span class="value">${props.amount.toLocaleString("vi-VN")} VND</span></div>
          <div class="row"><span class="label">Ngân hàng</span><span class="value">${props.bankLabel}</span></div>
          <div class="row"><span class="label">Nội dung</span><span class="value">${props.referenceCode}</span></div>
          <div class="row"><span class="label">Mã giao dịch</span><span class="value">${props.transactionId}</span></div>
        </div>
        <div class="hint">
          Hệ thống sẽ tự động kích hoạt gói ngay khi SePay báo giao dịch thành công với đúng nội dung chuyển khoản.
        </div>
      </main>
    </body>
  </html>`;
}
