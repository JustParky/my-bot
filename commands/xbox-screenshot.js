const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-screenshot')
    .setDescription('Get Xbox screenshot')
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
    const response = await retryRequest(`https://xbl.io/api/v2/screenshots/${xuid}`, {
      headers: { 'X-Authorization': process.env.XBOX_API_KEY },
    });
    const screenshots = response.data.screenshots || [];
    const gameScreenshot = screenshots.find(s => ['Fallout 76', 'Grand Theft Auto V', 'World of Warcraft', 'Deadside'].includes(s.titleName)) || screenshots[0];
    const embed = new EmbedBuilder()
      .setTitle(`📸 Latest Screenshot for ${gamertag}`)
      .setDescription(gameScreenshot ? `${gameScreenshot.titleName}: ${gameScreenshot.caption || 'No caption'}` : 'No screenshots found.')
      .setImage(gameScreenshot?.thumbnailUris?.[0]?.uri || null)
      .setColor(0x107c10);
    await interaction.editReply({ embeds: [embed] });
  },
};