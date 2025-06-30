const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-leaderboard')
    .setDescription('Get Fallout 76 leaderboard'),
  permissions: [],
  async execute(interaction, { retryRequest }) {
    await interaction.deferReply();
    const response = await retryRequest('https://xbl.io/api/v2/leaderboards/Fallout%2076/Global/Score', {
      headers: { 'X-Authorization': process.env.XBOX_API_KEY },
    });
    const top5 = response.data.leaderboard?.slice(0, 5) || [];
    const embed = new EmbedBuilder()
      .setTitle('🏅 Fallout 76 Global Leaderboard')
      .setDescription(top5.length ? top5.map((p, i) => `${i + 1}. ${p.gamertag}: ${p.value}`).join('\n') : 'No leaderboard data available.')
      .setColor(0x107c10);
    await interaction.editReply({ embeds: [embed] });
  },
};