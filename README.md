# Agent Portal

A Next.js portal for warehouse agents to log items and pallets using barcode scanning, manage session logs, and sync data with Airtable.

## Features
- **Agent Dashboard**: Search and select operations by Operation ID.
- **Barcode Scanning**: Scan item and pallet barcodes using a scanner or manual entry.
- **Session Logging**: Add, edit, and clear logs of items assigned to pallets before submitting.
- **Airtable Integration**: All item and pallet data is fetched from and submitted to Airtable.
- **Responsive UI**: Optimized for both desktop and mobile use.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root with the following:

```
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the portal.

## Usage

1. **Login**: (If authentication is enabled; otherwise, you are taken directly to the dashboard.)
2. **Dashboard**: Search for an operation by typing its Operation ID. Select an operation to begin logging.
3. **Operation Page**:
   - **Scan Items**: Scan item barcodes to select them for the current pallet.
   - **Scan Pallet**: Scan a pallet barcode or add it manually. If the scanned barcode does not belong to any displayed items, it will taken to be a pallet.
   - **Add to Log**: Assign selected items to the scanned pallet and add to the session log.
   - **Edit/Clear Logs**: Edit or remove logs before submitting.
   - **Submit Logs**: Submit all session logs to Airtable. Items are updated with their new pallet and status.

## API Endpoints

- `GET /api/airtable/operations` — List all operations with status 'On the way'.
- `GET /api/airtable/items?operationId=...` — List all items for a given operation.
- `POST /api/airtable/submit` — Submit logs. Body: `{ logs: LogEntry[] }`.

## Tech Stack
- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [Airtable](https://airtable.com/developers/web/api/introduction)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript

## Development
- All code is in the `app/` directory.
- Styles are managed with Tailwind CSS (`app/globals.css`).
- API routes are in `app/api/airtable/`.
- Main agent workflow is in `app/operations/[operationId]/page.tsx`.

## Contributing
- Use `npm run dev` for local development.
- TypeScript strict mode is enabled.
- See `tsconfig.json` for project config.

## License
MIT
