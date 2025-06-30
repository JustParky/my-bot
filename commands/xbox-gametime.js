const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-gametime')
    .setDescription('Get Xbox play time')
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
    const fallout76 = response.data.titles.find(t => t.name.includes('Fallout 76')) || { stats: [] };
    const hours = fallout76.stats?.find(s => s.name === 'MinutesPlayed')?.value / 60 || 0;
    const embed = new EmbedBuilder()
      .setTitle(`⏳ Play Time for ${gamertag}`)
      .setDescription(`Fallout 76: ${Math.floor(hours)} hours`)
      .setColor(0x107c10);
    await interaction.editReply({ embeds: [embed] });
  },
};