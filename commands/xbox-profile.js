const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-profile')
    .setDescription('Get Xbox profile')
    .addStringOption(option =>
      option.setName('gamertag')
        .setDescription('Xbox gamertag')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { retryRequest }) {
    await interaction.deferReply();
    const tag = interaction.options.getString('gamertag');
    const response = await retryRequest(`https://xbl.io/api/v2/search/${encodeURIComponent(tag)}`, {
      headers: { 'X-Authorization': process.env.XBOX_API_KEY },
    });
    if (!response.data.people?.length) throw new Error('Gamertag not found');
    const profile = response.data.people[0];
    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${tag} on Xbox Live`)
      .setThumbnail(profile.displayPicRaw ?? '')
      .addFields(
        { name: 'Tier', value: profile.detail?.accountTier ?? 'Unknown', inline: true },
        { name: 'Gamertag', value: tag, inline: true },
        { name: 'Gamerscore', value: profile.gamerScore ?? '0', inline: true },
      )
      .setColor(0x107c10)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },
};