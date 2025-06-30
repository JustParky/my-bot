const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-achievements')
    .setDescription('Get Xbox achievements')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { retryRequest }) {
    await interaction.deferReply();
    const gamertag = interaction.options.getString('gamertag');
    const searchResponse = await retryRequest(`https://xbl.io/api/v2/search/${encodeURIComponent(gamertag)}`, {
      headers: { 'X-Authorization': process.env.XBOX_API_KEY },
    });
    if (!searchResponse.data.people?.length) throw new Error('Gamertag not found');
    const xuid = searchResponse.data.people[0].xuid;
    const response = await retryRequest(`https://xbl.io/api/v2/achievements/player/${xuid}`, {
      headers: { 'X-Authorization': process.env.XBOX_API_KEY },
    });
    const fallout76 = response.data.titles.find(t => t.name.includes('Fallout 76')) || { achievements: [] };
    const embed = new EmbedBuilder()
      .setTitle(`🏆 Achievements for ${gamertag}`)
      .setDescription(fallout76.achievements?.slice(0, 5).map(a => `• ${a.name}: ${a.description}`).join('\n') || 'No Fallout 76 achievements found.')
      .setColor(0x107c10);
    await interaction.editReply({ embeds: [embed] });
  },
};