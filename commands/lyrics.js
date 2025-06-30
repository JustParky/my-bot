const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ServerQueue, splitMessage } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Fetch lyrics for a song')
    .addStringOption(option =>
      option.setName('song')
        .setDescription('Song name or current song')
        .setRequired(false)),
  permissions: [],
  async execute(interaction, { queues, genius, splitMessage }) {
    console.log('Executing /lyrics command');
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const songName = interaction.options.getString('song');

    try {
      if (!genius) {
        return interaction.editReply('❌ Lyrics feature unavailable: Missing Genius API key.');
      }

      const serverQueue = queues.get(guildId);
      const query = songName || serverQueue?.currentSong?.title || null;
      if (!query) {
        return interaction.editReply('❌ No song specified and no music is currently playing.');
      }

      console.log(`Searching lyrics for: ${query}`);
      const songs = await genius.songs.search(query);
      if (!songs.length) {
        return interaction.editReply('❌ No lyrics found for this song.');
      }

      const song = songs[0];
      const lyrics = await song.lyrics();
      const chunks = splitMessage(lyrics, 2000);

      const embed = new EmbedBuilder()
        .setTitle(`🎵 Lyrics for ${song.title}`)
        .setDescription(chunks[0].slice(0, 4096))
        .setColor(0x1db954)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i].slice(0, 2000), flags: 64 });
      }
    } catch (error) {
      console.error('Error in /lyrics command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};