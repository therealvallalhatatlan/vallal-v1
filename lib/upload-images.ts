import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function uploadImages(files: Blob[]): Promise<string[]> {
  const urls: string[] = []

  for (const file of files) {
    const fileName = `drop-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

    const { error: uploadError } = await supabase
      .storage
      .from('drops')
      .upload(fileName, file, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload failed:', uploadError.message)
      throw uploadError
    }

    const { data } = supabase.storage.from('drops').getPublicUrl(fileName)
    urls.push(data.publicUrl)
  }

  return urls
}
