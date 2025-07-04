const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ServerQueue, extractYouTubeID } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a YouTube song')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube URL or search query')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { getOrJoinVoiceChannel, getStream, queues, playNext, validateYouTubeURL, firstResultOrFail, client, player, history }) {
    console.log('Executing /play command');
    await interaction.deferReply();
    const query = interaction.options.getString('query');
    const guildId = interaction.guildId;
    const member = interaction.member;
    const channel = interaction.channel;

    try {
      const connection = await getOrJoinVoiceChannel(member, guildId, interaction.guild.voiceAdapterCreator);
      if (!connection) throw new Error('Failed to join voice channel');

      if (!queues.has(guildId)) {
        console.log(`Creating new ServerQueue for guild: ${guildId}`);
        queues.set(guildId, new ServerQueue(connection, channel));
      }
      const serverQueue = queues.get(guildId);

      let url = validateYouTubeURL(query) ? query : null;
      if (!url) {
        console.log(`Searching for: ${query}`);
        const search = require('play-dl');
        try {
          const results = await search.search(query, { limit: 1, source: { youtube: 'video' } });
          if (!results || results.length === 0) throw new Error('No search results found');
          url = results[0].url;
        } catch (searchError) {
          throw new Error(`Search failed: ${searchError.message}`);
        }
      }

      console.log(`Fetching info for URL: ${url}`);
      const ytdl = require('@distube/ytdl-core');
      let info;
      try {
        info = await ytdl.getInfo(url);
      } catch (ytdlError) {
        throw new Error(`Failed to fetch video info: ${ytdlError.message}`);
      }

      const artist = info.videoDetails.author?.name || 'Unknown Artist';
      const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);
      const duration = durationSeconds
        ? `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}`
        : 'Unknown';

      let stream;
      try {
        console.log(`Getting stream for URL: ${url}`);
        stream = await getStream(url);
        if (!stream) throw new Error('Failed to obtain stream');
      } catch (streamError) {
        throw new Error(`Stream retrieval failed: ${streamError.message}`);
      }

      const song = {
        title: info.videoDetails.title,
        artist: artist,
        url: url,
        stream: stream,
        requestedBy: member.user.tag,
        duration: durationSeconds,
        source: 'youtube',
      };

      console.log(`Adding song to queue: ${song.title}`);
      serverQueue.songs.push(song);

      const embed = new EmbedBuilder()
        .setTitle('🎵 Added to Queue')
        .setDescription(`**${song.title}**`)
        .addFields(
          { name: 'Artist', value: song.artist, inline: true },
          { name: 'Duration', value: duration, inline: true },
          { name: 'Requested by', value: song.requestedBy, inline: true }
        )
        .setThumbnail(`https://img.youtube.com/vi/${extractYouTubeID(song.url)}/default.jpg`)
        .setColor(0x1db954)
        .setTimestamp();

      if (!serverQueue.playing) {
        console.log('Starting playback');
        serverQueue.playing = true;
        try {
          await playNext(guildId, channel, client, player, queues, history);
        } catch (playError) {
          throw new Error(`Playback initiation failed: ${playError.message}`);
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /play command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};