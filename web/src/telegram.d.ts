interface TelegramWebAppUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_premium?: boolean;
}

interface TelegramWebAppInitData {
	query_id?: string;
	user?: TelegramWebAppUser;
	auth_date?: string;
	hash?: string;
}

interface TelegramWebApp {
	initData: string;
	initDataUnsafe: TelegramWebAppInitData;
	ready(): void;
	expand(): void;
	close(): void;
}

interface Window {
	Telegram?: {
		WebApp: TelegramWebApp;
	};
}
