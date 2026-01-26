#!/usr/bin/env ruby

# Script to add TripDetection files to Xcode project
# Run from ios folder: ruby add_trip_detection.rb

require 'xcodeproj'

# Open the project
project_path = 'GreenMobilityPass.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'GreenMobilityPass' }

if target.nil?
  puts "Error: Target 'GreenMobilityPass' not found"
  exit 1
end

puts "Found target: #{target.name}"

# First, remove all old references to TripDetection files
files_to_remove = []
target.source_build_phase.files.each do |build_file|
  if build_file.file_ref&.path&.include?('TripDetection') ||
     build_file.file_ref&.real_path&.to_s&.include?('TripDetection')
    files_to_remove << build_file
  end
end
files_to_remove.each do |bf|
  puts "Removing old build file: #{bf.file_ref&.path}"
  bf.remove_from_project
end

# Find main group
main_group = project.main_group.find_subpath('GreenMobilityPass', false)
if main_group.nil?
  puts "Error: Main group 'GreenMobilityPass' not found"
  puts "Available groups:"
  project.main_group.children.each { |c| puts "  - #{c.name || c.path}" }
  exit 1
end

puts "Found main group: #{main_group.display_name}"

# Remove old TripDetection group if exists
main_group.children.each do |child|
  if child.display_name == 'TripDetection' || child.path&.include?('TripDetection')
    puts "Removing old TripDetection group: #{child.display_name}"
    child.remove_from_project
  end
end

# Create new TripDetection group with correct path
# The path should be relative to the main group (GreenMobilityPass)
trip_detection_group = main_group.new_group('TripDetection', 'GreenMobilityPass/TripDetection', :group)
puts "Created TripDetection group"

# Files to add
all_files = [
  'TripState.swift',
  'LocalJourney.swift',
  'TripStateMachine.swift',
  'MotionActivityManager.swift',
  'LocationManager.swift',
  'TripDetectionManager.swift',
  'TripDetectionModule.swift',
  'TripDetectionModule.m'
]

# Add files with correct paths
all_files.each do |filename|
  # Create file reference - path relative to parent group's source tree
  file_ref = trip_detection_group.new_reference(filename)
  file_ref.source_tree = '<group>'
  target.source_build_phase.add_file_reference(file_ref)
  puts "  Added #{filename}"
end

# Add bridging header if not exists
bridging_header_name = "GreenMobilityPass-Bridging-Header.h"
existing_header = main_group.files.find { |f| f.path == bridging_header_name }
if existing_header.nil?
  header_ref = main_group.new_reference(bridging_header_name)
  puts "  Added Bridging Header"
else
  puts "  Bridging Header already exists"
end

# Set bridging header in build settings
target.build_configurations.each do |config|
  config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] = '$(SRCROOT)/GreenMobilityPass/GreenMobilityPass-Bridging-Header.h'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
end
puts "  Updated build settings"

# Save the project
project.save
puts "\n✅ Project updated successfully!"
