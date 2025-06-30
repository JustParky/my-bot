const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox-gameinfo')
    .setDescription('Get game info')
    .addStringOption(option =>
      option.setName('game')
        .setDescription('Game name')
        .setRequired(true)
        .addChoices(
          { name: 'Fallout 76', value: 'fallout76' },
          { name: 'GTA V', value: 'gtav' },
          { name: 'WoW', value: 'wow' },
          { name: 'Deadside', value: 'deadside' },
        )),
  permissions: [],
  async execute(interaction, { retryRequest }) {
    await interaction.deferReply();
    const game = interaction.options.getString('game');
    const gameInfo = {
      fallout76: {
        title: 'Fallout 76',
        description: 'A post-apocalyptic multiplayer RPG by Bethesda. Explore Appalachia, complete quests, and build your C.A.M.P.',
        image: 'https://i.ibb.co/JFMLwZg/aaaa.png',
        details: 'Released: 2018 | Developer: Bethesda Game Studios | Genre: Action RPG',
      },
      gtav: {
        title: 'Grand Theft Auto V',
        description: 'An open-world action-adventure game by Rockstar Games. Engage in heists, missions, and online multiplayer chaos.',
        image: 'https://i.ibb.co/0nX0X0X/gtav.png',
        details: 'Released: 2013 | Developer: Rockstar North | Genre: Action-Adventure',
      },
      wow: {
        title: 'World of Warcraft',
        description: 'A massively multiplayer online RPG by Blizzard Entertainment. Quest in Azeroth and battle epic foes.',
        image: 'https://i.ibb.co/0nX0X0X/wow.png',
        details: 'Released: 2004 | Developer: Blizzard Entertainment | Genre: MMORPG',
      },
      deadside: {
        title: 'Deadside',
        description: 'A hardcore multiplayer survival shooter set in a vast open world with intense PvP and PvE encounters.',
        image: 'https://i.ibb.co/0nX0X0X/deadside.png',
        details: 'Released: 2020 | Developer: Bad Pixel | Genre: Survival Shooter',
      },
    };
    const selectedGame = gameInfo[game];
    if (!selectedGame) throw new Error('Invalid game selected.');
    try {
      // Attempt to fetch additional data from OpenXBL if available
      const response = await retryRequest(`https://xbl.io/api/v2/search/${encodeURIComponent(selectedGame.title)}`, {
        headers: { 'X-Authorization': process.env.XBOX_API_KEY },
      });
      const gameData = response.data.titles?.find(t => t.name.toLowerCase().includes(selectedGame.title.toLowerCase())) || {};
      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${selectedGame.title}`)
        .setDescription(selectedGame.description)
        .addFields(
          { name: 'Details', value: selectedGame.details, inline: false },
          { name: 'Players Online', value: gameData.currentPlayers?.toString() || 'Unknown', inline: true },
          { name: 'Achievements', value: gameData.achievement?.totalAchievements?.toString() || 'Unknown', inline: true },
        )
        .setImage(selectedGame.image)
        .setColor(0x107c10)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      // Fallback to static info if API call fails
      console.warn(`Failed to fetch game data for ${selectedGame.title}: ${err.message}`);
      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${selectedGame.title}`)
        .setDescription(selectedGame.description)
        .addFields({ name: 'Details', value: selectedGame.details, inline: false })
        .setImage(selectedGame.image)
        .setColor(0x107c10)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  },
};