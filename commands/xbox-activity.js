const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-activity')
    .setDescription('Get Xbox activity')
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
    const response = await retryRequest(`https://xbl.io/api/v2/activity/${xuid}`, {
      headers: { 'X-Authorization': process.env.XBOX_API_KEY },
    });
    const recent = response.data.activityItems?.find(a => ['Fallout 76', 'Grand Theft Auto V', 'World of Warcraft', 'Deadside'].includes(a.titleName)) || response.data.activityItems?.[0];
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Recent Activity for ${gamertag}`)
      .setDescription(recent ? `${recent.titleName}: ${recent.description || 'Playing'}` : 'No recent activity.')
      .setColor(0x107c10);
    await interaction.editReply({ embeds: [embed] });
  },
};