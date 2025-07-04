const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hi to Nexus'),
  permissions: [],
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('👋 Welcome to Nexus AI!')
      .setDescription(
        'Hello! I’m Nexus, your personal AI companion designed to enhance your Discord experience in the wasteland.\n\n' +
        '**Key Features:**\n' +
        '```diff\n' +
        '- Music Playback: Queue songs from YouTube, Spotify, and more!\n' +
        '- Gaming Stats: Check Fallout 76 silo codes and Xbox info.\n' +
        '- Fun Commands: Enjoy coin flips, random numbers, and memes.\n' +
        '```\n\n' +
        'Whether you’re exploring the Deadside of Fallout or chilling with friends, I’ve got you covered! ' +
        'Use `/help` to explore all my commands and start interacting. Let’s make your server more awesome together!\n\n' +
        '**About Me:**\n' +
        '```diff\n' +
        '- Built by xAI to assist and entertain.\n' +
        '- Always here to help—feel free to ask anything!\n' +
        '```'
      )
      .setColor(0xFFFFFF) // Blue color
      .setTimestamp()
      .setFooter({ text: 'Nexus AI - Your Wasteland Buddy' });

    // Add a large image (publicly available URL related to AI or wasteland theme)
    const imageUrl = 'https://i.postimg.cc/W4P74N9f/robot-dough.gif';
    embed.setImage(imageUrl);

    await interaction.reply({ embeds: [embed] });
  },
};