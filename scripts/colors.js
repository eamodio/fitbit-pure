const fs = require('fs');
const chroma = require('chroma-js');

const colors = chroma
	.scale(['rgb(51, 153, 255)', 'rgb(255, 51, 68)'])
	.mode('lch')
	.colors(201);
fs.writeFileSync('colors.txt', JSON.stringify(colors), 'utf8');
