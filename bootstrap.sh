#!/bin/bash
set -x; #echo on

#Ideally would use Ansible to do this stuff instead of a shell script. But the Ansible Controller-server can't be windows, so direct provisioning using vagrant doesn't work.
# Possible workaround here boots VM then runs ansible locally to complete the rest of the setup: https://groups.google.com/forum/#!topic/vagrant-up/3fNhoow7mTE

export DEBIAN_FRONTEND=noninteractive
apt-get update;
apt-get install -q -y htop;

#Install json parser so we can use config.json in this file.
apt-get install -q -y jq;

#Need apache and php5 for phpmyadmin.
apt-get install -q -y apache2 php5 curl php5-curl git;

cd /vagrant;
php -r "readfile('https://getcomposer.org/installer');" | php
php composer.phar install


#cat > /etc/apache2/conf-available/vagrant.conf << "EOF"
#<VirtualHost *:80>
#    ServerAdmin webmaster@localhost
#    DocumentRoot /vagrant
#    DirectoryIndex index.php
#</VirtualHost>
#EOF
#sudo a2dissite 000-default.conf
#sudo a2ensite vagrant.conf

sudo rm -rf /var/www/html
sudo ln -s /vagrant /var/www/html