const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Get a quote')
    .addStringOption(option =>
      option.setName('who')
        .setDescription('Author (e.g., yoda)')
        .setRequired(false)),
  permissions: [],
  async execute(interaction) {
    await interaction.deferReply();
    const who = (interaction.options.getString('who') || '').toLowerCase();
    let quoteText, quoteAuthor;
    try {
      const qRes = await axios.get('https://api.quotable.io/random?tags=science|paradox');
      if (qRes.status !== 200) throw new Error(`Quotable status ${qRes.status}`);
      quoteText = qRes.data.content;
      quoteAuthor = qRes.data.author || 'Unknown';
    } catch (tlsErr) {
      console.warn('primary quote source failed, falling back:', tlsErr.message);
      const altRes = await axios.get('https://raw.githubusercontent.com/JamesFT/Database-Quotes-JSON/master/quotes.json');
      if (altRes.status !== 200) throw new Error(`GitHub status ${altRes.status}`);
      const list = altRes.data;
      const pick = list[Math.floor(Math.random() * list.length)];
      quoteText = pick.quoteText;
      quoteAuthor = pick.quoteAuthor || 'Unknown';
    }
    if (who === 'yoda') {
      const yRes = await axios.get(`https://yoda-api.vercel.app/api/yoda/${encodeURIComponent(quoteText)}`);
      if (yRes.status === 200 && yRes.headers['content-type']?.includes('application/json')) {
        quoteText = yRes.data.yoda || quoteText;
      }
    } else {
      quoteText += `\n— *${quoteAuthor}*`;
    }
    await interaction.editReply({ content: `🧠 ${quoteText}` });
  },
};