const { SlashCommandBuilder } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a YouTube song')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube URL or search query')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { getOrJoinVoiceChannel, getStream, queues, playNext, validateYouTubeURL, firstResultOrFail }) {
    console.log('Executing /play command');
    await interaction.deferReply();
    const query = interaction.options.getString('query');
    const guildId = interaction.guildId;
    const member = interaction.member;
    const channel = interaction.channel;

    try {
      // Validate and join voice channel
      console.log(`Joining voice channel for guild: ${guildId}`);
      const connection = await getOrJoinVoiceChannel(member, guildId, interaction.guild.voiceAdapterCreator);

      // Create or get server queue
      if (!queues.has(guildId)) {
        console.log(`Creating new ServerQueue for guild: ${guildId}`);
        queues.set(guildId, new ServerQueue(connection, channel));
      }
      const serverQueue = queues.get(guildId);

      // Validate or search for YouTube URL
      let url = validateYouTubeURL(query) ? query : null;
      if (!url) {
        console.log(`Searching for: ${query}`);
        const search = require('play-dl');
        const results = await search.search(query, { limit: 1, source: { youtube: 'video' } });
        if (!results || results.length === 0) throw new Error('No search results found');
        url = results[0].url;
      }

      // Get song info
      console.log(`Fetching info for URL: ${url}`);
      const ytdl = require('@distube/ytdl-core');
      const info = await ytdl.getInfo(url);
      const song = {
        title: info.videoDetails.title,
        url: url,
        stream: await getStream(url),
        requestedBy: member.user.tag,
        duration: parseInt(info.videoDetails.lengthSeconds, 10),
        source: 'youtube',
      };

      // Add song to queue
      console.log(`Adding song to queue: ${song.title}`);
      serverQueue.songs.push(song);

      // Play if not already playing
      if (!serverQueue.playing) {
        console.log('Starting playback');
        serverQueue.playing = true;
        await playNext(guildId, channel);
      }

      await interaction.editReply(`🎵 Added to queue: **${song.title}**`);
    } catch (error) {
      console.error('Error in /play command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};