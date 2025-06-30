const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a meme')
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('Subreddit (optional)')
        .setRequired(false)),
  permissions: [],
  async execute(interaction) {
    await interaction.deferReply();
    const topic = (interaction.options.getString('topic') || '').trim() || 'memes';
    const apiURL = `https://meme-api.com/gimme/${encodeURIComponent(topic)}`;
    const res = await axios.get(apiURL);
    if (res.status !== 200) throw new Error(`meme-api error (${res.status})`);
    const m = res.data;
    if (!m.url || !m.url.match(/\.(jpe?g|png|gif)$/i)) throw new Error('Got a non-image post');
    const embed = new EmbedBuilder()
      .setTitle(m.title || 'Random Meme')
      .setImage(m.url)
      .setURL(m.postLink)
      .setFooter({ text: `r/${m.subreddit} • 👍 ${m.ups}` })
      .setColor(0xb300b3);
    await interaction.editReply({ embeds: [embed] });
  },
};