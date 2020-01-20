const fs = require('fs');
const chroma = require('chroma-js');

const colors = chroma
	.scale(['rgb(51, 153, 255)', 'rgb(255, 51, 68)'])
	.mode('lch')
	.colors(161);

const i18n = colors.map((c, i) => `msgid "heart_rate_color_${i}"\nmsgstr "${c}"`).join('\n\n');

fs.writeFileSync('colors.txt', JSON.stringify(colors), 'utf8');
fs.writeFileSync('colors_i18n.po', i18n, 'utf8');
