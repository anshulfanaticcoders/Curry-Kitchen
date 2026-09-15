-- Apply the approved homepage photograph once; later admin edits stay editable.
UPDATE `page_backgrounds`
SET `imageUrl` = '/images/hero-approved-thali-v2.webp',
    `focalPoint` = 'CENTER',
    `overlay` = 'NONE',
    `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `slot` = 'home.hero';
