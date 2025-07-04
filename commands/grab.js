const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grab')
    .setDescription('Send the current song details to your DMs'),
  async execute(interaction, { queues, extractYouTubeID }) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const serverQueue = queues.get(guildId);

    if (!serverQueue || !serverQueue.currentSong) {
      return interaction.editReply({ content: '❌ No song is currently playing.', ephemeral: true });
    }

    const song = serverQueue.currentSong;

    const songEmbed = new EmbedBuilder()
      .setTitle('🎶 Your Song Request')
      .setDescription(`**${song.title}**`)
      .addFields(
        { name: 'Artist', value: song.artist || 'Unknown Artist', inline: true },
        { name: 'Link', value: `[Listen Here](${song.url})`, inline: true }
      )
      .setColor(0x1db954)
      .setThumbnail(song.source === 'youtube' ? `https://img.youtube.com/vi/${extractYouTubeID(song.url)}/hqdefault.jpg` : null)
      .setImage('https://i.postimg.cc/tX6FqCvt/Chat-GPT-Image-Jul-1-2025-11-37-16-PM.png')
      .setFooter({ text: 'Powered by Nexus' })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [songEmbed] });
      return interaction.editReply({ content: '✅ Song details sent to your DMs!', ephemeral: true });
    } catch (error) {
      return interaction.editReply({ content: '❌ I couldn’t send you a DM. Please check if your DMs are open.', ephemeral: true });
    }
  },
};