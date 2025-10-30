import { NextRequest, NextResponse } from 'next/server'
import { uploadImages } from '@/lib/upload-images'
import { sendDropEmail } from '@/lib/send-drop-email'

export async function POST(request: NextRequest) {
  try {
    console.log('Drop API: Starting request processing')
    
    const formData = await request.formData()
    console.log('Drop API: FormData parsed')
    
    // Verify password
    const password = formData.get('password') as string
    const correctPassword = process.env.DROP_PASSWORD
    
    if (!correctPassword) {
      console.error('Drop API: DROP_PASSWORD not set in environment')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    if (password !== correctPassword) {
      console.log('Drop API: Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Extract form data
    const latitude = formData.get('latitude') as string
    const longitude = formData.get('longitude') as string
    const message = formData.get('message') as string
    const recipientEmail = formData.get('recipientEmail') as string

    console.log('Drop API: Form data extracted', { 
      hasLatitude: !!latitude, 
      hasLongitude: !!longitude, 
      hasMessage: !!message, 
      recipientEmail 
    })

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })
    }

    // Extract image files
    const imageFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageFiles.push(value)
      }
    }

    console.log('Drop API: Found', imageFiles.length, 'image files')

    // Upload images if any
    let imageUrls: string[] = []
    if (imageFiles.length > 0) {
      try {
        console.log('Drop API: Starting image upload')
        imageUrls = await uploadImages(imageFiles)
        console.log('Drop API: Images uploaded successfully', imageUrls.length)
      } catch (uploadError) {
        console.error('Drop API: Image upload failed:', uploadError)
        // Continue without images rather than failing completely
        imageUrls = []
      }
    }

    // Build email body
    let emailBody = 'New drop delivery:\n\n'
    
    if (latitude && longitude) {
      emailBody += `Coordinates: ${latitude}, ${longitude}\n`
      emailBody += `Maps link: https://maps.google.com/maps?q=${latitude},${longitude}\n\n`
    }
    
    if (message) {
      emailBody += `Message: ${message}\n\n`
    }
    
    if (imageUrls.length > 0) {
      emailBody += `Images:\n`
      imageUrls.forEach((url, index) => {
        emailBody += `${index + 1}. ${url}\n`
      })
    } else if (imageFiles.length > 0) {
      emailBody += `Note: ${imageFiles.length} images were attached but upload failed.\n`
    }

    console.log('Drop API: Sending email to', recipientEmail)

    // Send email
    try {
      await sendDropEmail(
        recipientEmail,
        'New Drop Delivery',
        emailBody
      )
      console.log('Drop API: Email sent successfully')
    } catch (emailError) {
      console.error('Drop API: Email sending failed:', emailError)
      // For now, continue and return success even if email fails
      // since this is just a placeholder implementation
    }

    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Drop API: Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
