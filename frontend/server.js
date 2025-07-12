  
  // Password change endpoint
  else if (path === '/api/change-password' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { phone_number, old_password, new_password } = data;
      
      console.log(`Password change attempt for: ${phone_number}`);
      
      if (!phone_number || !old_password || !new_password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'All fields required' }));
        return;
      }
      
      if (new_password.length < 6 || new_password.length > 8) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Password must be 6-8 characters' }));
        return;
      }
      
      const user = users.find(u => u.phone === phone_number && u.active);
      
      if (!user) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }
      
      if (!verifyPassword(old_password, user.password)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Current password incorrect' }));
        return;
      }
      
      // Update password
      user.password = hashPassword(new_password);
      user.passwordChanged = true;
      
      addToLog('password_changed', `Password changed for ${user.name}`, user.phone);
      
      console.log(`✅ Password changed successfully for ${user.name}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Password changed successfully'
      }));
    });
  }
  
