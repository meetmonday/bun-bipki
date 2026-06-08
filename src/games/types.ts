export interface GameResult {
	win: boolean;
	outcomeLabelI18nKey: string;
	outcomeEmoji: string;
}

export interface GameChoice {
	id: string;
	labelI18nKey: string;
}

export interface GameDefinition {
	id: string;
	emoji: string;
	i18nKey: string;
	choices: GameChoice[];
	resolve(bet: number, choice: string): GameResult;
}
