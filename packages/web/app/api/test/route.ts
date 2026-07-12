import { NextResponse } from 'next/server'

export async function POST() {
  console.log('TEST ENDPOINT HIT!')
  return NextResponse.json({ message: 'Test endpoint works!' })
}

export async function GET() {
  console.log('TEST GET HIT!')
  return NextResponse.json({ message: 'Test GET works!' })
}
