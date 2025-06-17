// Notionスタイルのカラーパレットとスタイル定義
export const notionColors = {
	// グレースケール
	gray: 'rgb(55, 53, 47)',
	grayLight: 'rgba(55, 53, 47, 0.65)',
	grayBg: 'rgba(55, 53, 47, 0.08)',
	border: 'rgba(55, 53, 47, 0.09)',
	hoverBg: 'rgba(55, 53, 47, 0.03)',

	// ステータスカラー
	status: {
		default: 'rgba(227, 226, 224, 0.5)',
		progress: 'rgba(255, 212, 130, 0.2)',
		complete: 'rgba(211, 229, 214, 0.3)',
		blocked: 'rgba(255, 226, 221, 0.3)',
		review: 'rgba(220, 218, 255, 0.3)'
	},

	// プライオリティカラー
	priority: {
		high: '#FF4444',
		medium: '#FFA500',
		low: '#00AA00'
	},

	// テキストカラー
	text: {
		primary: 'rgb(55, 53, 47)',
		secondary: 'rgba(55, 53, 47, 0.65)',
		tertiary: 'rgba(55, 53, 47, 0.5)'
	}
};

export const notionStyles = {
	// 共通のホバースタイル
	hover: 'hover:bg-gray-50 transition-colors duration-100',

	// セルのパディング
	cellPadding: 'px-2 py-1.5',

	// ボーダー
	borderBottom: 'border-b border-gray-100',

	// フォントサイズ
	fontSize: {
		small: 'text-sm',
		medium: 'text-base',
		large: 'text-lg'
	},

	// 影
	shadow: {
		sm: 'shadow-sm',
		md: 'shadow-md',
		lg: 'shadow-lg'
	}
};
