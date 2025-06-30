const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-friends')
    .setDescription('Get Xbox friends')
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
    const response = await retryRequest(`https://xbl.io/api/v2/friends/${xuid}`, {
      headers: { 'X-Authorization': process.env.XBOX_API_KEY },
    });
    const online = response.data.people.filter(p => p.presenceState === 'Online').slice(0, 5);
    const embed = new EmbedBuilder()
      .setTitle(`👥 ${gamertag}'s Online Friends`)
      .setDescription(online.map(f => `• ${f.gamertag} (${f.presenceDetails?.[0]?.titleName || 'Unknown'})`).join('\n') || 'No friends online.')
      .setColor(0x107c10);
    await interaction.editReply({ embeds: [embed] });
  },
};