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

interface TelegramThemeParams {
	bg_color?: string;
	secondary_bg_color?: string;
	text_color?: string;
	hint_color?: string;
	link_color?: string;
	button_color?: string;
	button_text_color?: string;
	header_bg_color?: string;
	accent_text_color?: string;
	section_bg_color?: string;
	section_header_text_color?: string;
	subtitle_text_color?: string;
	destructive_text_color?: string;
}

interface TelegramWebApp {
	initData: string;
	initDataUnsafe: TelegramWebAppInitData;
	themeParams: TelegramThemeParams;
	ready(): void;
	expand(): void;
	close(): void;
	onEvent(eventType: string, callback: () => void): void;
	offEvent(eventType: string, callback: () => void): void;
}

interface Window {
	Telegram?: {
		WebApp: TelegramWebApp;
	};
}
