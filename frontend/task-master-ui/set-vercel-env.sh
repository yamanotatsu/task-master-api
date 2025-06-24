#!/bin/bash

# Vercel環境変数設定スクリプト
# 使用方法: ./set-vercel-env.sh

echo "Vercel環境変数を設定します..."

# Supabase URL
read -p "NEXT_PUBLIC_SUPABASE_URL (例: https://your-project.supabase.co): " SUPABASE_URL
if [ ! -z "$SUPABASE_URL" ]; then
    vercel env add NEXT_PUBLIC_SUPABASE_URL production < <(echo "$SUPABASE_URL")
    vercel env add NEXT_PUBLIC_SUPABASE_URL preview < <(echo "$SUPABASE_URL")
    echo "✓ NEXT_PUBLIC_SUPABASE_URL を設定しました"
fi

# Supabase Anon Key
read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_KEY
if [ ! -z "$SUPABASE_KEY" ]; then
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production < <(echo "$SUPABASE_KEY")
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview < <(echo "$SUPABASE_KEY")
    echo "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY を設定しました"
fi

# API URL
read -p "NEXT_PUBLIC_API_URL (例: https://your-api.com): " API_URL
if [ ! -z "$API_URL" ]; then
    vercel env add NEXT_PUBLIC_API_URL production < <(echo "$API_URL")
    vercel env add NEXT_PUBLIC_API_URL preview < <(echo "$API_URL")
    echo "✓ NEXT_PUBLIC_API_URL を設定しました"
fi

echo ""
echo "環境変数の設定が完了しました。"
echo "設定を確認するには: vercel env ls"
echo "デプロイするには: vercel --prod"