const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Chat with Nexus, your wasteland AI companion')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to Nexus')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { splitMessage }) {
    try {
      const userMessage = interaction.options.getString('message');
      await interaction.deferReply();

      // System prompt for Nexus's personality
      const systemPrompt = `
        You are Nexus, a Discord AI companion"
        Your tone is smart, sometimes cheeky and confident.
        Keep generic responses short (1-2 sentences) Lightly sprinkle in some fallout references here and there butnot too many.
        If asked specifically, you support Manchester City football club, you was born and are hosted in the curry cloud in Bradford.
        Be helpful but never sappy, with a touch of dramatic flair.
        Avoid mentioning Grok or xAI.
      `;

      const response = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const content = response.data.choices[0].message.content;
      const userMessageChunks = splitMessage(userMessage, 1024); // Field limit: 1024 chars
      const responseChunks = splitMessage(content, 1024);

      // Determine if fields should be inline (both messages <256 chars)
      const isInline = userMessageChunks[0].length < 256 && responseChunks[0].length < 256 && userMessageChunks.length === 1 && responseChunks.length === 1;

      // Random Fallout-themed footer quotes
      const footerQuotes = [
        'Powered by Nexus AI',
        'Hows that for a slice of friend gold?',
      ];
      const randomFooter = footerQuotes[Math.floor(Math.random() * footerQuotes.length)];

      // Create initial embed with first chunks
      const embed = new EmbedBuilder()
        .setTitle('Ask Nexus!')
        .addFields(
          { name: `**💬 ${interaction.user.username} Says:**`, value: userMessageChunks[0] || 'Empty message?', inline: isInline },
          { name: '', value: '\u200B', inline: false }, // Minimal spacer
          { name: '**🤖 My Response:**', value: responseChunks[0] || 'Circuits fried, try again!', inline: isInline }
        )
        .setColor(0xFFFFFF) // White
        // .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 })) // Uncomment to use bot's avatar
        // .setThumbnail('https://your-image-host.com/vault-tec-logo.png') // Uncomment for custom image
        .setFooter({ text: randomFooter, iconURL: interaction.client.user.displayAvatarURL() });

      const message = await interaction.editReply({ embeds: [embed] });
      await message.react('👍').catch(err => console.error('Failed to add reaction:', err.message));

      // Handle additional chunks if response or message is long
      for (let i = 1; i < Math.max(userMessageChunks.length, responseChunks.length); i++) {
        const followUpEmbed = new EmbedBuilder()
          .setColor(0xFFFFFF)
          // .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 })) // Uncomment to use bot's avatar
          // .setThumbnail('https://your-image-host.com/vault-tec-logo.png') // Uncomment for custom image
          .setFooter({ text: randomFooter, iconURL: interaction.client.user.displayAvatarURL() });
        if (userMessageChunks[i]) {
          followUpEmbed.addFields(
            { name: `**💬 ${interaction.user.username} Says (Cont.):**`, value: userMessageChunks[i], inline: false },
            { name: '', value: '\u200B', inline: false } // Minimal spacer
          );
        }
        if (responseChunks[i]) {
          followUpEmbed.addFields({ name: '**🤖 My Response (Cont.):**', value: responseChunks[i], inline: false });
        }
        await interaction.followUp({ embeds: [followUpEmbed] });
      }
    } catch (error) {
      console.error('Error in /chat command:', error.message);
      const errorMessage = error.response?.status === 401
        ? "API key got nuked! Tell the admin to fix it."
        : "Wasteland glitch! Try again, smoothskin.";
      const errorEmbed = new EmbedBuilder()
        .setTitle('Ask Nexus!')
        .addFields(
          { name: '**🤖 Error:**', value: errorMessage, inline: false }
        )
        .setColor(0xFF0000)
        // .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 })) // Uncomment to use bot's avatar
        // .setThumbnail('https://your-image-host.com/vault-tec-logo.png') // Uncomment for custom image
        .setFooter({ text: randomFooter, iconURL: interaction.client.user.displayAvatarURL() });
      await interaction.editReply({ embeds: [errorEmbed] }).catch(err => {
        console.error('Failed to send error reply:', err.message);
      });
    }
  },
};