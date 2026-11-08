export type PageId = 'dashboard' | 'invoices' | 'lottery' | 'history' | 'settings'
export type Navigate = (page: PageId) => void
